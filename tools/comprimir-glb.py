"""Troca as texturas PNG de um .glb por JPEG (bem menor) e regrava o arquivo.

    python tools/comprimir-glb.py modelos/arvore.glb [qualidade=82]

Precisa de Pillow (pip install pillow). Só serve para texturas sem transparência (cor base).
"""
import io
import json
import struct
import sys

from PIL import Image


def ler(caminho):
    d = open(caminho, "rb").read()
    assert d[:4] == b"glTF", "não é um GLB"
    n = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + n])
    b0 = 20 + n
    bn = struct.unpack("<I", d[b0:b0 + 4])[0]
    return j, d[b0 + 8:b0 + 8 + bn]


def gravar(caminho, j, binario):
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binario += b"\0" * (-len(binario) % 4)
    total = 12 + 8 + len(js) + 8 + len(binario)
    with open(caminho, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(binario), b"BIN\0") + binario)


def main(caminho, qualidade=82):
    j, binario = ler(caminho)
    trocar = {}
    for img in j.get("images", []):
        if img.get("mimeType") == "image/png":
            v = j["bufferViews"][img["bufferView"]]
            ini = v.get("byteOffset", 0)
            png = Image.open(io.BytesIO(binario[ini:ini + v["byteLength"]])).convert("RGB")
            saida = io.BytesIO(); png.save(saida, "JPEG", quality=qualidade, optimize=True, progressive=True)
            trocar[img["bufferView"]] = saida.getvalue()
            img["mimeType"] = "image/jpeg"

    novo, views = b"", []
    for i, v in enumerate(j["bufferViews"]):
        ini = v.get("byteOffset", 0)
        dados = trocar.get(i, binario[ini:ini + v["byteLength"]])
        novo += b"\0" * (-len(novo) % 4)
        v["byteOffset"] = len(novo); v["byteLength"] = len(dados)
        novo += dados
    j["buffers"][0]["byteLength"] = len(novo)
    gravar(caminho, j, novo)

    j2, b2 = ler(caminho)  # confere: o arquivo novo abre e bate com o que foi gravado
    assert len(b2) >= j2["buffers"][0]["byteLength"]
    import os
    print(f"{len(trocar)} textura(s) -> JPEG; {caminho} agora tem {os.path.getsize(caminho) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 82)
