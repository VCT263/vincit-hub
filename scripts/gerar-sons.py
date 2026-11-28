"""Gera os efeitos sonoros dos estilos de som (public/sons) com o Earshot (MIT, roda na CPU, sem API).

Uso: python3 scripts/gerar-sons.py  (precisa do earshot no PATH ou em EARSHOT=/caminho/earshot e do ffmpeg)
Para cada estilo e papel grava public/sons/<estilo>/<papel>.mp3 e o momento do pico em
src/lib/motion/sons.json; grava também public/sons/<estilo>/previa.mp3 (5 s de demonstração).
"""
import json, os, re, subprocess, tempfile

EARSHOT = os.environ.get("EARSHOT", "earshot")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPEIS = ["abertura", "entrada", "itens", "destaque", "transicao", "marca"]
ESTILOS = {
    "delicado":   {"abertura": ["shine/sweep"], "entrada": ["whoosh/soft"], "itens": ["tick/glass"], "destaque": ["sparkle/burst"], "transicao": ["whoosh/soft"], "marca": ["coin/bright"]},
    "tatil":      {"abertura": ["zipper/jacket"], "entrada": ["cloth/rustle"], "itens": ["paper/card"], "destaque": ["scissors/snip"], "transicao": ["swipe/hand"], "marca": ["step/heels"]},
    "minimal":    {"abertura": ["hover/tone"], "entrada": ["click/trackpad"], "itens": ["hover/tone"], "destaque": ["success/click"], "transicao": ["send/swoosh"], "marca": ["next/step"]},
    "cinematico": {"abertura": ["rise/reverse"], "entrada": ["boom/deep"], "itens": ["tick/metal"], "destaque": ["boom/short"], "transicao": ["reverse_swell/cymbal"], "marca": ["braam/hit"]},
    "agressivo":  {"abertura": ["glitch/burst"], "entrada": ["hit/drop"], "itens": ["glitch/short"], "destaque": ["hit/crit"], "transicao": ["whoosh/heavy"], "marca": ["hit/crit", "sub_drop/pro"]},
}
# o som que sobe até o pico (riser) fica inteiro; nos outros, o silêncio antes do pico é cortado
SUBIDAS = {"rise/reverse", "reverse_swell/cymbal", "shine/sweep"}
MAX_S = 2.2
# volume de cada papel e de cada estilo na mistura (o mesmo do exportador, em src/lib/motion/som.ts)
GANHO = {"abertura": 0.7, "entrada": 0.8, "itens": 0.45, "destaque": 0.85, "transicao": 0.75, "marca": 0.9}
GANHO_ESTILO = {"minimal": 0.6, "delicado": 0.8}


def make(som, arq):
    out = subprocess.run([EARSHOT, "make", f"sound={som}", "-o", arq], capture_output=True, text=True, check=True).stdout
    m = re.search(r"\(([\d.]+) s, peak at ([\d.]+) s", out)
    return float(m[1]), float(m[2])


def main():
    mapa = {}
    with tempfile.TemporaryDirectory() as tmp:
        for estilo, papeis in ESTILOS.items():
            pasta = os.path.join(RAIZ, "public", "sons", estilo); os.makedirs(pasta, exist_ok=True)
            mapa[estilo] = {}
            for papel in PAPEIS:
                camadas = []
                for i, som in enumerate(papeis[papel]):
                    w = os.path.join(tmp, f"{estilo}-{papel}-{i}.wav"); dur, pico = make(som, w)
                    corte = 0.0 if som in SUBIDAS else max(0.0, pico - 0.06)
                    camadas.append((w, corte, pico - corte))
                pico = max(c[2] for c in camadas)
                ins, filt = [], []
                for i, (w, corte, p) in enumerate(camadas):
                    ins += ["-i", w]
                    atraso = int((pico - p) * 1000)
                    filt.append(f"[{i}]atrim=start={corte:.3f},asetpts=PTS-STARTPTS,adelay={atraso}:all=1[c{i}]")
                mix = "".join(f"[c{i}]" for i in range(len(camadas))) + f"amix=inputs={len(camadas)}:normalize=0,atrim=0:{MAX_S},afade=t=out:st={MAX_S-0.25}:d=0.25,aresample=44100[o]"
                bruto = os.path.join(tmp, f"{estilo}-{papel}.wav")
                subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(filt + [mix]), "-map", "[o]", "-ac", "1", bruto], check=True)
                # pico em -3 dBFS: loudnorm em som curto infla ruído; o volume de cada papel fica no exportador
                med = subprocess.run(["ffmpeg", "-i", bruto, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
                ganho = -3.0 - float(re.search(r"max_volume: ([-\d.]+) dB", med)[1])
                dest = os.path.join(pasta, f"{papel}.mp3")
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", bruto, "-af", f"volume={ganho:.2f}dB", "-b:a", "96k", dest], check=True)
                mapa[estilo][papel] = round(pico, 3)
            # prévia de 5 s: a mesma linha do tempo da vinheta de Natal da ISYS
            linha = [("abertura", 0.15), ("entrada", 0.85)] + [("itens", 1.85 + 0.07 * k) for k in range(5)] + [("destaque", 2.58), ("transicao", 4.0), ("marca", 4.3)]
            ins, filt = [], []
            for i, (papel, t) in enumerate(linha):
                ins += ["-i", os.path.join(pasta, f"{papel}.mp3")]
                ini = t - mapa[estilo][papel]
                filt.append(f"[{i}]atrim=start={max(0, -ini):.3f},asetpts=PTS-STARTPTS,adelay={int(max(0, ini) * 1000)}:all=1,volume={GANHO.get(papel, 0.85) * GANHO_ESTILO.get(estilo, 1)}[p{i}]")
            mix = "".join(f"[p{i}]" for i in range(len(linha))) + f"amix=inputs={len(linha)}:normalize=0,apad,atrim=0:5.5,loudnorm=I=-16:TP=-1.5,aresample=44100[o]"
            subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(filt + [mix]), "-map", "[o]", "-ac", "1", "-b:a", "96k", os.path.join(pasta, "previa.mp3")], check=True)
            print(estilo, mapa[estilo])
    with open(os.path.join(RAIZ, "src", "lib", "motion", "sons.json"), "w") as f:
        json.dump(mapa, f, indent=2); f.write("\n")


if __name__ == "__main__":
    main()
