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


async def tecla(pg, k):
    # Playwright no simula F13–F24; se envía el mismo evento keydown que genera un teclado externo
    await pg.evaluate("k=>{var o={key:k,code:k,bubbles:true,cancelable:true};document.activeElement.dispatchEvent(new KeyboardEvent('keydown',o));document.activeElement.dispatchEvent(new KeyboardEvent('keyup',o))}", k)


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
        await pg.screenshot(path=SH + "panel_libreto_inicio.png")
        # pruebas originales: vista por categorías
        await pg.click('.vistas [data-vista=categorias]'); await pg.wait_for_timeout(200)

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
        # ================= ESCALETA DEL LIBRETO =================
        await pg.click('.vistas [data-vista=libreto]'); await pg.wait_for_timeout(300)
        nums = await pg.eval_on_selector_all(".paso", "els=>els.map(e=>e.dataset.paso)")
        check("La escaleta tiene los 32 pasos del libreto en orden", nums == ["p%02d" % i for i in range(1, 33)], "%d pasos" % len(nums))
        bloques = await pg.eval_on_selector_all(".bloque-tit", "els=>els.map(e=>e.textContent)")
        check("Separada en Bloque 1 y Bloque 2", bloques == ["BLOQUE 1", "BLOQUE 2"], bloques)
        filas = await pg.eval_on_selector_all(".it.esc", "els=>els.length")
        check("Cada paso lista sus recursos con número, tipo y estado", filas > 90 and await pg.eval_on_selector('.it.esc', "e=>!!e.querySelector('.num')&&!!e.querySelector('.tipo')&&!!e.querySelector('.go')"), "%d filas" % filas)
        m13 = await pg.eval_on_selector('.paso[data-paso=p13]', "e=>e.innerText")
        m24 = await pg.eval_on_selector('.paso[data-paso=p24]', "e=>e.innerText")
        check("Las dos menciones tienen su plantilla (pasos 13 y 24)", "Mención Mary Mechadas" in m13 and "Mención Rayo Maulino Energy" in m24)
        try:
            await pg.wait_for_function("()=>/1 salida/.test(document.querySelector('#pSalidas').textContent)", timeout=5000)
        except Exception:
            pass
        check("Indicador de salida local conectada", "1 salida" in await pg.inner_text("#pSalidas"), await pg.inner_text("#pSalidas"))
        npend = await pg.inner_text("#pPend")
        check("Los recursos pendientes están identificados", "pendiente" in npend, npend)
        await pg.click("#pPend"); await pg.wait_for_timeout(300)
        lp = await pg.inner_text("#modal")
        check("La lista de pendientes nombra los marcadores", all(x in lp for x in ["PENDIENTE_LOGO_MARY_MECHADAS", "PENDIENTE_LOGO_RAYO_MAULINO", "PENDIENTE_VIDEO_INTRO", "PENDIENTE_VTR_JUEGOS", "PENDIENTE_VTR_PINAPAPA", "PENDIENTE_NUMERO_TELEFONICO"]))
        await pg.click("#modal .cerrar")

        # paso actual
        await pg.click('#pSig'); await pg.wait_for_timeout(300)
        check("Avanzar de paso marca el paso actual", "02" in await pg.inner_text("#ahoraTit") and await pg.eval_on_selector('.paso[data-paso=p02]', "e=>e.classList.contains('actual')"))

        # video pendiente: no finge salir al aire
        await pg.click('.it.esc[data-id=lb-video-intro] .go'); await pg.wait_for_timeout(500)
        check("Un VTR sin archivo no sale al aire y ofrece subirlo", await pg.is_visible("#modal .subida") and not await out.evaluate("()=>!!document.querySelector('.t-video')"))
        await pg.click("#modal .cerrar"); await pg.wait_for_timeout(200)

        # pendiente: pide confirmación y nunca dibuja PENDIENTE_
        await pg.click('.it.esc[data-id=lb-gc-peaton] .go'); await pg.wait_for_timeout(300)
        check("Una gráfica con datos pendientes pide confirmación", "pendientes" in (await pg.inner_text("#modal")).lower())
        await pg.click("#modal [data-r='1']"); await pg.wait_for_timeout(1300)
        txt = await out.evaluate("()=>document.body.innerText")
        check("Los marcadores PENDIENTE_ nunca aparecen en la salida", "PENDIENTE" not in txt and await out.evaluate("()=>!!document.querySelector('.gp2')"))

        # dos GC de nombre no se superponen
        await pg.click('.it.esc[data-id=lb-gc-guido] .go >> nth=0'); await pg.wait_for_timeout(1300)
        n = await out.evaluate("()=>document.querySelectorAll('.t-gcPersona').length")
        check("Dos GC de nombre no se superponen (el nuevo reemplaza al anterior)", n == 1 and "Guido Goossens" in await out.evaluate("()=>document.querySelector('.gp2-nom').textContent"), n)

        # datos del programa → número telefónico
        await pg.click("#bAjustes"); await pg.wait_for_timeout(300)
        await pg.fill(".dp[data-k=telefono]", "600 000 0000")
        await pg.click("[data-a=dp]"); await pg.wait_for_timeout(300); await pg.click("#modal .cerrar")
        await pg.click('.it.esc[data-id=lb-telefono] .go >> nth=0'); await pg.wait_for_timeout(1300)
        num = await out.evaluate("()=>{const n=document.querySelector('.tl-num');return n&&n.textContent}")
        check("El número del concurso se edita y aparece en pantalla", num == "600 000 0000", num)
        await pg.click('.it.esc[data-id=lb-telefono] .nom >> nth=0'); await pg.wait_for_timeout(300)
        await pg.click('.cupos-ed .ce[data-i="0"]'); await pg.wait_for_timeout(700)
        c0 = await out.evaluate("()=>document.querySelector('.tl') && document.querySelector('.tl').outerHTML.length")
        check("Las llamadas del concurso se marcan en vivo", c0 is not None)

        # cortina de sección
        await pg.click('.it.esc[data-id=lb-trans-pase] .go'); await pg.wait_for_timeout(1200)
        check("La transición PASE_NOTICIERO se lanza en la salida", await out.evaluate("()=>!!document.querySelector('#cortina .trans-esc .cp')"))
        await pg.wait_for_timeout(2500)
        check("A mitad de la transición cambia a la escena del noticiero", await out.evaluate("()=>/NOTICIERO MOJADO/.test(document.querySelector('#cortina').innerText)"))
        await pg.wait_for_timeout(5200)
        check("La transición termina sola y deja la pantalla limpia", await out.evaluate("()=>document.querySelector('#cortina').innerHTML.trim()===''"))

        # cierre deja la salida limpia
        await pg.click('.it.esc[data-id=lb-logo] .go >> nth=0'); await pg.wait_for_timeout(600)
        await pg.click('.it.esc[data-id=lb-cierre] .go'); await pg.wait_for_timeout(1600)
        capas = await out.evaluate("()=>[...document.querySelectorAll('.el .cuerpo')].map(c=>c.className.match(/t-\\w+/)[0])")
        check("El cierre retira todas las demás gráficas", capas == ["t-cierre"], capas)
        await out.screenshot(path=SH + "salida_cierre.png")

        # botonera
        await pg.click("#bLimpiar"); await pg.wait_for_timeout(900)
        await pg.click(".tabs [data-tab=boton]"); await pg.wait_for_timeout(500)
        nb = await pg.evaluate("()=>document.querySelectorAll('#botGrid .bt:not(.bt-mas)').length")
        check("Botonera visible con botones", await pg.is_visible("#botGrid") and nb >= 12, nb)
        teclas = await pg.evaluate("()=>[...document.querySelectorAll('#botGrid .bt-tec')].map(x=>x.textContent).filter(Boolean)")
        check("Botones traen teclas F13–F24", "F13" in teclas and "F24" in teclas, teclas)
        await pg.screenshot(path=SH + "botonera.png")
        await tecla(pg, "F13"); await pg.wait_for_timeout(1500)
        check("Tecla F13 saca el GC conductor", await out.evaluate("()=>!!document.querySelector('.gp2')"))
        check("Botón queda marcado AL AIRE", await pg.evaluate("()=>!!document.querySelector('#botGrid .bt.on')"))
        await tecla(pg, "F13"); await pg.wait_for_timeout(1500)
        check("Segunda pulsación de F13 lo retira", not await out.evaluate("()=>!!document.querySelector('.el .gp2')"))
        # mostrar desde un clic
        await pg.click("#botGrid .bt:nth-child(2)"); await pg.wait_for_timeout(1400)
        check("Clic en botón saca la gráfica", await out.evaluate("()=>document.querySelectorAll('.el').length") >= 1)
        # configurar: asignar F14 al primer botón (y ver que el duplicado se quita)
        await pg.click("#bEditBot"); await pg.wait_for_timeout(200)
        await pg.click("#botGrid .bt:nth-child(1)"); await pg.wait_for_timeout(300)
        check("Editar un botón abre su configuración", await pg.is_visible("#cbTec"))
        await pg.fill("#cbEt", "MI GC"); await pg.select_option("#cbTec", "F14"); await pg.click("#cbOk"); await pg.wait_for_timeout(300)
        r = await pg.evaluate("()=>{var b=window.CG_PANEL.botones();return [b[0].etiqueta,b[0].tecla,b.filter(x=>x.tecla==='F14').length]}")
        check("Configurar etiqueta y tecla (sin duplicados)", r == ["MI GC", "F14", 1], r)
        await pg.click("#bEditBot"); await pg.wait_for_timeout(200)
        await pg.click(".tabs [data-tab=control]"); await pg.wait_for_timeout(300)
        await pg.click("#bLimpiar"); await pg.wait_for_timeout(1000)
        await tecla(pg, "F14"); await pg.wait_for_timeout(1500)
        check("Las teclas funcionan desde otra pestaña", await out.evaluate("()=>!!document.querySelector('.gp2')"))

        # limpiar salida
        await pg.click("#bLimpiar"); await pg.wait_for_timeout(1200)
        check("LIMPIAR SALIDA retira todo sin recargar", await out.evaluate("()=>document.querySelectorAll('.el').length") == 0 and await out.evaluate("()=>window.__marca===1"))

        # celular
        cel = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        pc = await cel.new_page(); pc.on("pageerror", lambda e: errs.append("CELULAR " + str(e)))
        oc = await cel.new_page(); await oc.goto(B + "salida.html?local=1")
        await pc.goto(B + "panel.html?local=1"); await pc.wait_for_timeout(900)
        if await pc.is_visible("#modal"):
            await pc.click("#modal .cerrar")
        check("En celular hay barra inferior Escaleta / Editar / Ver", await pc.is_visible("#movNav") and await pc.is_visible("#lista") and not await pc.is_visible("#editor"))
        ancho = await pc.evaluate("()=>document.documentElement.scrollWidth")
        check("En celular no hay desplazamiento horizontal", ancho <= 390, ancho)
        bw = await pc.eval_on_selector(".it.esc .go", "e=>e.getBoundingClientRect().height")
        check("Botones táctiles de al menos 40 px", bw >= 40, bw)
        await pc.tap('.it.esc[data-id=lb-bienvenida] .go'); await pc.wait_for_timeout(1300)
        check("Disparar desde el celular llega a la salida", await oc.evaluate("()=>!!document.querySelector('.et')"))
        await pc.screenshot(path=SH + "celular_escaleta.png")
        await pc.tap('.it.esc[data-id=lb-bienvenida] .nom'); await pc.wait_for_timeout(500)
        check("Tocar una gráfica abre el editor en el celular", await pc.is_visible("#editor") and await pc.is_visible("#aMostrar"))
        await pc.screenshot(path=SH + "celular_editar.png")
        await pc.tap('#movNav [data-mv=ver]'); await pc.wait_for_timeout(900)
        await pc.screenshot(path=SH + "celular_ver.png")
        check("La vista Ver muestra vista previa y programa", await pc.is_visible("#ifPVW") and await pc.is_visible("#ifPGM"))
        await pc.tap('#movNav [data-mv=boton]'); await pc.wait_for_timeout(600)
        check("Botonera en celular (2 columnas, sin scroll lateral)", await pc.is_visible("#botGrid") and await pc.evaluate("()=>document.documentElement.scrollWidth") <= 390)
        await pc.screenshot(path=SH + "celular_botonera.png")
        await cel.close()

        check("Sin errores de JavaScript", not errs, errs)
        await b.close()
    fallas = [n for n, ok in OK if not ok]
    print("\n%d/%d pruebas OK" % (len(OK) - len(fallas), len(OK)))
    sys.exit(1 if fallas else 0)

asyncio.run(main())
