#!/usr/bin/env python3
"""Genera data/catalogo.js a partir de la API pública de la tienda WooCommerce actual.

Uso (desde cualquier carpeta):  python -I tools/actualizar_catalogo.py
Solo usa la biblioteca estándar de Python.
"""
import html
import json
import re
import urllib.request
from pathlib import Path

BASE = "https://arizajoyeria.com.co/wp-json/wc/store/v1/products"
UPLOADS = "https://arizajoyeria.com.co/wp-content/uploads/"
SALIDA = Path(__file__).resolve().parent.parent / "data" / "catalogo.js"
AGENTE = {"User-Agent": "Mozilla/5.0 (catalogo ARIZA)"}

# Corrige tildes y mayúsculas al pasar los nombres de MAYÚSCULAS a oración.
TILDES = {
    "corazon": "corazón", "aguila": "águila", "arcangel": "arcángel", "balin": "balín",
    "selecciòn": "selección", "fantasia": "fantasía", "pave": "pavé", "piedreria": "pedrería",
}
PROPIOS = [
    "Rolex", "Cartier", "Gucci", "Van Cleef", "San Benito", "Virgen", "Cristo", "Guadalupe",
    "Milagrosa", "David", "Miguel", "Arcángel", "ARIZA", "Selección",
]
# Todo lo que sigue a la primera especificación (peso, talla, medida) se saca del nombre.
CORTE_SPEC = re.compile(r"(?:\b(?:peso|medida|talla)\b|\bt\s*:?\s*\d|\d+(?:[.,]\d+)?\s*(?:gr|cm|mm)\b).*$", re.I)


def traer(params):
    """Descarga todas las páginas de un listado de la API."""
    pagina, datos = 1, []
    while True:
        url = f"{BASE}?per_page=100&page={pagina}{params}"
        with urllib.request.urlopen(urllib.request.Request(url, headers=AGENTE), timeout=60) as r:
            total_paginas = int(r.headers.get("X-WP-TotalPages", "1"))
            datos += json.load(r)
        if pagina >= total_paginas:
            return datos
        pagina += 1


def limpiar(texto):
    texto = html.unescape(texto or "").replace("\xa0", " ").replace("⁠", "")
    return re.sub(r"\s+", " ", texto).strip()


def sin_html(texto):
    return limpiar(re.sub(r"<[^>]+>", " ", texto or ""))


def nombre_visible(crudo):
    """'ANILLO HOMBRE – DISEÑO AGUILA 3.4 GR' -> 'Anillo hombre – diseño águila'."""
    partes = re.split(r"\s+[–-]\s*", limpiar(crudo))
    utiles = [CORTE_SPEC.sub("", p).strip(" -–.,:/") for p in partes]
    nombre = " – ".join(p for p in utiles if p).lower()
    for mal, bien in TILDES.items():
        nombre = re.sub(rf"\b{mal}\b", bien, nombre)
    nombre = nombre[:1].upper() + nombre[1:]
    for propio in PROPIOS:
        nombre = re.sub(rf"\b{propio.lower()}\b", propio, nombre, flags=re.I)
    return nombre


def especificaciones(*fuentes):
    """Extrae peso, talla y medida del nombre o de la descripción corta."""
    texto = " ".join(limpiar(f) for f in fuentes)
    specs = {}
    peso = re.search(r"(\d+(?:[.,]\d+)?)\s*gr\b", texto, re.I)
    if peso:
        specs["peso"] = peso.group(1).replace(",", ".") + " gr"
    talla = re.search(r"\b(?:talla|t)\s*:?\s*(\d+(?:\s+\d/\d)?)", texto, re.I)
    if talla:
        specs["talla"] = talla.group(1)
    medida = re.search(r"(\d+(?:[.,]\d+)?)\s*(cm|mm)\b", texto, re.I)
    if medida:
        specs["medida"] = f"{medida.group(1).replace(',', '.')} {medida.group(2).lower()}"
    return specs


def etiqueta_variacion(texto):
    """'Peso/Medida: Peso: 1.3 gr. T: 6 1/2' -> 'Peso: 1.3 gr. T: 6 1/2'."""
    texto = limpiar(texto)
    texto = re.sub(r"^(Variaciones|Variación|Peso/Medida|Peso y Talla|Piedrería|Medida|Peso|Color|Valor)\s*:\s*", "", texto, count=1)
    if texto.isupper():
        texto = texto.capitalize()
    for propio in PROPIOS:
        texto = re.sub(rf"\b{propio}\b", propio, texto, flags=re.I)
    texto = re.sub(r"\b(gr|cm|mm)\b", lambda m: m.group(1).lower(), texto, flags=re.I)
    return texto.strip(" .")


def clasificar(p):
    """Traduce las categorías de WooCommerce a los filtros del sitio."""
    slugs = {c["slug"] for c in p["categories"]}
    tipo = None
    if slugs & {"anillos", "anillos-dama-oro-nacional", "anillos-caballero-oro-nacional", "anillos-quinceanera", "anillos-promesa"}:
        tipo = "anillos"
    elif "candongas" in slugs:
        tipo = "candongas"
    elif "topos-topos-y-candongas" in slugs:
        tipo = "topos"
    elif slugs & {"cadenas", "cadena-oro-nacional", "cadenas-dama-oro-nacional", "cadenas-caballero-oro-nacional"}:
        tipo = "cadenas"
    elif "balines" in slugs:
        tipo = "balines"
    elif slugs & {"pulsos", "pulsos-oro-italiano", "pulsos-dama", "pulsos-caballero", "pulso-infantil"}:
        tipo = "pulsos"
    elif slugs & {"dijes", "dijes-religiosos-oro-nacional"}:
        tipo = "dijes"
    elif "herrajes" in slugs:
        tipo = "herrajes"
    elif "tobilleras-dama" in slugs:
        tipo = "tobilleras"
    elif p["slug"] == "bono-regalo-ariza":
        tipo = "bono"

    para = []
    if slugs & {"anillos-dama-oro-nacional", "anillos-quinceanera", "anillos-promesa", "cadenas-dama-oro-nacional", "pulsos-dama", "tobilleras-dama"}:
        para.append("dama")
    if slugs & {"anillos-caballero-oro-nacional", "cadenas-caballero-oro-nacional", "pulsos-caballero"}:
        para.append("caballero")
    if "pulso-infantil" in slugs:
        para.append("infantil")

    oro = None
    if "oro-italiano" in slugs:
        oro = "italiano"
    elif any("oro-nacional" in s for s in slugs) or slugs & {"anillos-quinceanera", "anillos-promesa"}:
        oro = "nacional"

    ocasion = "promesa" if "anillos-promesa" in slugs else "quinceanera" if "anillos-quinceanera" in slugs else None
    return tipo, para, oro, ocasion, "dijes-religiosos-oro-nacional" in slugs


def ruta(url):
    return url.replace(UPLOADS, "")


def main():
    productos = traer("")
    variaciones = {}
    for v in traer("&type=variation"):
        variaciones.setdefault(v["parent"], []).append(v)

    salida = []
    for p in productos:
        tipo, para, oro, ocasion, religioso = clasificar(p)
        variantes = sorted(
            ({"id": v["id"], "e": etiqueta_variacion(v.get("variation", "")), "p": int(v["prices"]["price"])}
             for v in variaciones.get(p["id"], []) if v.get("is_in_stock")),
            key=lambda v: v["p"],
        ) if p["type"] == "variable" else []
        precios = [v["p"] for v in variantes] or [int(p["prices"]["price"])]
        registro = {
            "id": p["id"], "s": p["slug"], "n": nombre_visible(p["name"]), "t": tipo,
            "pmin": min(precios), "pmax": max(precios),
            "img": [{"f": ruta(i["src"]), "t": ruta(i["thumbnail"])} for i in p["images"]],
        }
        if variantes:
            registro["v"] = variantes
        else:
            specs = especificaciones(p["name"], sin_html(p["short_description"]))
            if specs:
                registro["e"] = specs
        if para:
            registro["para"] = para
        if oro:
            registro["oro"] = oro
        if ocasion:
            registro["oc"] = ocasion
        if religioso:
            registro["rel"] = 1
        if p["slug"] == "bono-regalo-ariza":
            registro["digital"] = 1
        salida.append(registro)

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    cuerpo = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
    SALIDA.write_text(
        "// Generado por tools/actualizar_catalogo.py. No editar a mano.\n"
        f"window.ARIZA_UPLOADS={json.dumps(UPLOADS)};\nwindow.ARIZA_CATALOGO={cuerpo};\n",
        encoding="utf-8",
    )
    print(f"{len(salida)} productos, {sum(len(r.get('v', [])) for r in salida)} variantes -> {SALIDA}")


if __name__ == "__main__":
    main()
