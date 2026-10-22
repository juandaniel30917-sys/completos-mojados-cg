"""Prueba de punta a punta en MODO LOCAL (sin internet): panel → salida independiente.
Uso:  python3 -m http.server 8765  (en la carpeta del proyecto)  y luego  python3 test/e2e_local.py
Requiere: pip install playwright"""
import asyncio, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("CG_BASE", "http://127.0.0.1:8765/")
SH = os.environ.get("CG_SHOTS", "test/capturas/")
os.makedirs(SH, exist_ok=True)
OK = []


def check(nombre, cond, extra=""):
    OK.append((nombre, bool(cond)))
    print(("  OK  " if cond else "  FALLA ") + nombre + (" · " + str(extra) if extra else ""))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        ctx = await b.new_context(viewport={"width": 1440, "height": 860})
        errs = []
        out = await ctx.new_page()
        out.on("pageerror", lambda e: errs.append("SALIDA " + str(e)))
        await out.set_viewport_size({"width": 1920, "height": 1080})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append("PANEL " + str(e)))
        await pg.goto(B + "panel.html?local=1"); await pg.wait_for_timeout(800)
        await out.goto(B + "salida.html?local=1"); await out.wait_for_timeout(300)
        if await pg.is_visible("#modal"):
            await pg.click("#modal .cerrar")
        await pg.screenshot(path=SH + "panel_control_inicio.png")

        # 1. editar → no sale al aire
        if not await pg.is_visible('.it:has-text("Última hora")'):
            await pg.click(".cat[data-cat=nombres] .cat-cab")
        await pg.click('.it:has-text("Última hora") .nom'); await pg.wait_for_timeout(300)
        await pg.fill("#c_titular", "PRUEBA DE TITULAR EN VIVO")
        await pg.click('.tabs button[data-tab=visual]'); await pg.wait_for_timeout(900)
        await pg.screenshot(path=SH + "panel_visual_borrador.png")
        o1 = await out.evaluate("()=>document.body.innerText")
        check("Editar un borrador NO lo saca al aire", "PRUEBA DE TITULAR" not in o1)
        pvw = await pg.frame_locator("#ifPVW").locator(".gn-tit").inner_text()
        check("La vista previa muestra el borrador", pvw == "PRUEBA DE TITULAR EN VIVO", pvw)

        # 2. mostrar
        await pg.click("#aMostrar"); await pg.wait_for_timeout(1200)
        o2 = await out.evaluate("()=>document.querySelector('.gn-tit') && document.querySelector('.gn-tit').textContent")
        check("MOSTRAR llega a la salida independiente", o2 == "PRUEBA DE TITULAR EN VIVO", o2)

        # 3. actualizar sin recargar ni repetir entrada
        await out.evaluate("()=>{window.__marca=1}")
        await pg.fill("#c_titular", "TITULAR CORREGIDO"); await pg.wait_for_timeout(200)
        check("Con cambios el botón dice ACTUALIZAR", "ACTUALIZAR" in await pg.inner_text("#aMostrar"))
        await pg.click("#aMostrar"); await pg.wait_for_timeout(120)
        clases = await out.evaluate("()=>{const n=document.querySelector('.t-gcNoticiero.swap-in');return n?n.className:'(sin swap-in)'}")
        check("Actualiza con fundido cruzado (sin repetir la entrada)", "swap-in" in clases and "entra" not in clases, clases)
        await pg.wait_for_timeout(700)
        o3 = await out.evaluate("()=>document.querySelector('.gn-tit').textContent")
        check("La salida cambió el texto sin recargarse", o3 == "TITULAR CORREGIDO" and await out.evaluate("()=>window.__marca===1"), o3)
        await pg.screenshot(path=SH + "panel_visual_al_aire.png")
        await out.screenshot(path=SH + "salida_al_aire.png")
        transp = await out.evaluate("()=>[getComputedStyle(document.documentElement).backgroundColor,getComputedStyle(document.body).backgroundColor]")
        check("La salida tiene fondo transparente", all(t in ("rgba(0, 0, 0, 0)", "transparent") for t in transp), transp)

        # 4. pestañas
        await pg.click('.tabs button[data-tab=control]'); await pg.wait_for_timeout(300)
        check("Cambiar de pestaña no interrumpe la emisión", await out.evaluate("()=>!!document.querySelector('.gn-tit')"))
        check("Cambiar de pestaña no pierde el borrador", await pg.input_value("#c_titular") == "TITULAR CORREGIDO")

        # 5. ocultar
        await pg.click("#aOcultar"); await pg.wait_for_timeout(1000)
        check("OCULTAR saca la gráfica de la salida", not await out.evaluate("()=>!!document.querySelector('.gn-tit')"))

        # 6. aviso (evento)
        if not await pg.is_visible('.it:has-text("Aviso noticiero")'):
            await pg.click('.cat[data-cat=avisos] .cat-cab'); await pg.wait_for_timeout(300)
        await pg.click('.it:has-text("Aviso noticiero") .go'); await pg.wait_for_timeout(700)
        check("Un aviso se lanza en la salida", await out.evaluate("()=>document.querySelectorAll('.aviso').length") == 1)

        # 7. temporizador
        await pg.click(".cat[data-cat=concurso] .cat-cab") if not await pg.is_visible('.it:has-text("Temporizador")') else None
        await pg.click('.it:has-text("Temporizador") .nom'); await pg.wait_for_timeout(300)
        await pg.click('#aExtra [data-a=iniciar]'); await pg.wait_for_timeout(2300)
        t = await out.evaluate("()=>document.querySelector('.tm-n') && document.querySelector('.tm-n').textContent")
        check("El temporizador corre en la salida", t in ("00:08", "00:07"), t)
        await pg.click('#aExtra [data-a=pausar]'); await pg.wait_for_timeout(1300)
        t2 = await out.evaluate("()=>document.querySelector('.tm-n').textContent")
        check("Pausar detiene el temporizador", t2 == t or abs(int(t2[-2:]) - int(t[-2:])) <= 1, t2)
        await pg.click("#aOcultar"); await pg.wait_for_timeout(700)

        # 8. persistencia
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.click('.it:has-text("Última hora") .nom') if await pg.is_visible('.it:has-text("Última hora")') else None
        await pg.wait_for_timeout(300)
        check("Los cambios persisten al recargar", await pg.input_value("#c_titular") == "TITULAR CORREGIDO")
        check("Sin errores de JavaScript", not errs, errs)
        await b.close()
    fallas = [n for n, ok in OK if not ok]
    print("\n%d/%d pruebas OK" % (len(OK) - len(fallas), len(OK)))
    sys.exit(1 if fallas else 0)

asyncio.run(main())
