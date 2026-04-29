#!/usr/bin/env python3
"""
bootstrap.py — Instalador de la configuración global de Claude Code.

Copia los archivos de este repositorio a ~/.claude/ y verifica/instala
las dependencias necesarias para que el sistema funcione correctamente.

Uso:
    python3 bootstrap.py           # instalación completa
    python3 bootstrap.py --check   # solo verificar sin instalar
    python3 bootstrap.py --force   # sobreescribir archivos existentes

Requisitos previos (solo estos, el script instala el resto):
    - Python 3.9 o superior
    - Claude Code instalado (npm install -g @anthropic-ai/claude-code)
"""

import argparse
import json
import os
import sys as _sys_early

# Forzar UTF-8 en stdout/stderr para compatibilidad con Windows (cp1252 por defecto)
if hasattr(_sys_early.stdout, "reconfigure"):
    try:
        _sys_early.stdout.reconfigure(encoding="utf-8")
        _sys_early.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
import platform
import shutil
import subprocess
import sys
from pathlib import Path

# ── Configuración ──────────────────────────────────────────────────────────────

REPO_DIR   = Path(__file__).parent.resolve()
CLAUDE_DIR = Path.home() / ".claude"

PYTHON_MIN = (3, 9)

# Dependencias Python requeridas
PIP_REQUIRED = [
    ("mcp", "mcp>=1.0.0", "MCP SDK — requerido por mcps/centinel-server.py"),
]

# Dependencias de sistema (solo advertencia si faltan, no bloquean)
SYSTEM_OPTIONAL = [
    ("node",  "Node.js 18+",  "Requerido para MCPs con npx (server-filesystem, server-github…)"),
    ("npm",   "npm",          "Requerido para MCPs con npx"),
    ("git",   "Git",          "Requerido si se usa el flujo git-workflow.md"),
]

# Archivos y directorios a copiar de este repo a ~/.claude/
# (source relativo al repo, dest relativo a ~/.claude/)
COPY_MAP = [
    # Archivo maestro
    ("CLAUDE.md",               "CLAUDE.md"),
    ("settings.json",           "settings.json"),
    ("SKILL-REGISTRY.md",       "SKILL-REGISTRY.md"),
    ("git-workflow.md",         "git-workflow.md"),
    ("agent-coordination.md",   "agent-coordination.md"),
    # Directorios completos
    ("skills",                  "skills"),
    ("agents",                  "agents"),
    ("hooks",                   "hooks"),
    ("mcps",                    "mcps"),
]


# ── Utilidades de salida ───────────────────────────────────────────────────────

def ok(msg: str)   -> None: print(f"  [OK]   {msg}")
def warn(msg: str) -> None: print(f"  [WARN] {msg}")
def err(msg: str)  -> None: print(f"  [ERR]  {msg}")
def info(msg: str) -> None: print(f"         {msg}")
def sep()          -> None: print()


# ── Comprobaciones ─────────────────────────────────────────────────────────────

def check_python() -> bool:
    v = sys.version_info[:2]
    if v >= PYTHON_MIN:
        ok(f"Python {sys.version.split()[0]} — requerido >= {'.'.join(map(str, PYTHON_MIN))}")
        return True
    err(f"Python {v[0]}.{v[1]} es demasiado antiguo. Se necesita >= {'.'.join(map(str, PYTHON_MIN))}")
    return False


def check_pip_package(import_name: str, display: str) -> bool:
    try:
        __import__(import_name)
        ok(f"{display} — instalado")
        return True
    except ImportError:
        return False


def install_pip_package(pip_spec: str, display: str) -> bool:
    info(f"Instalando {pip_spec}…")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", pip_spec, "--quiet"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            ok(f"{display} — instalado correctamente")
            return True
        err(f"pip install {pip_spec} falló:\n{result.stderr.strip()}")
        return False
    except Exception as e:
        err(f"No se pudo ejecutar pip: {e}")
        return False


def check_system_tool(cmd: str, display: str, description: str) -> bool:
    found = shutil.which(cmd) is not None
    if found:
        ok(f"{display} — encontrado en PATH")
    else:
        warn(f"{display} — NO encontrado. {description}")
    return found


def check_claude_code() -> bool:
    found = shutil.which("claude") is not None
    if found:
        ok("Claude Code — encontrado en PATH")
    else:
        warn("Claude Code — NO encontrado. Instalar con: npm install -g @anthropic-ai/claude-code")
    return found


# ── Instalación de archivos ────────────────────────────────────────────────────

def resolve_dest(dest_rel: str) -> Path:
    return CLAUDE_DIR / dest_rel


def copy_item(src: Path, dst: Path, force: bool) -> str:
    """Copia un archivo o directorio. Devuelve 'copied', 'skipped' o 'updated'."""
    if dst.exists() and not force:
        return "skipped"
    action = "updated" if dst.exists() else "copied"
    if src.is_dir():
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    return action


def install_files(force: bool) -> dict:
    CLAUDE_DIR.mkdir(parents=True, exist_ok=True)
    stats = {"copied": 0, "updated": 0, "skipped": 0, "errors": 0}

    for src_rel, dst_rel in COPY_MAP:
        src = REPO_DIR / src_rel
        dst = resolve_dest(dst_rel)

        if not src.exists():
            warn(f"No encontrado en el repo: {src_rel} — omitiendo")
            stats["errors"] += 1
            continue

        try:
            action = copy_item(src, dst, force)
            stats[action] += 1
            label = {
                "copied":  "NUEVO    ",
                "updated": "ACT.     ",
                "skipped": "EXISTENTE",
            }[action]
            info(f"[{label}] {src_rel}  →  {dst}")
        except Exception as e:
            err(f"Error copiando {src_rel}: {e}")
            stats["errors"] += 1

    return stats


def set_hook_permissions() -> None:
    """Hace ejecutable el hook en sistemas Unix."""
    if platform.system() == "Windows":
        return
    hook = CLAUDE_DIR / "hooks" / "centinel_preflight.py"
    if hook.exists():
        hook.chmod(hook.stat().st_mode | 0o111)
        ok("Permisos de ejecución en hooks/centinel_preflight.py")


def verify_hook() -> bool:
    """Verifica que el hook funcione correctamente con un comando seguro."""
    hook = CLAUDE_DIR / "hooks" / "centinel_preflight.py"
    if not hook.exists():
        warn("Hook no instalado — saltando verificación")
        return False

    env = os.environ.copy()
    env["CLAUDE_TOOL_INPUT"] = '{"command": "git status"}'
    result = subprocess.run(
        [sys.executable, str(hook)],
        env=env, capture_output=True, text=True
    )
    if result.returncode == 0:
        ok("Hook centinel_preflight.py — responde correctamente (comando seguro pasa)")
    else:
        err(f"Hook falló con comando seguro (exit={result.returncode}): {result.stdout.strip()}")
        return False

    env["CLAUDE_TOOL_INPUT"] = '{"command": "rm -rf /"}'
    result = subprocess.run(
        [sys.executable, str(hook)],
        env=env, capture_output=True, text=True
    )
    if result.returncode == 1:
        ok("Hook centinel_preflight.py — bloquea comandos destructivos correctamente")
        return True
    else:
        err(f"Hook NO bloqueó 'rm -rf /' (exit={result.returncode}). Revisar instalación.")
        return False


def print_next_steps() -> None:
    sep()
    print("=== PASOS SIGUIENTES ===")
    sep()
    print("1. Añadir el MCP centinel a ~/.claude.json (opcional pero recomendado):")
    print()
    mcp_config = {
        "mcpServers": {
            "centinel": {
                "command": "python3",
                "args": [str(CLAUDE_DIR / "mcps" / "centinel-server.py")]
            }
        }
    }
    print("   " + json.dumps(mcp_config, indent=4).replace("\n", "\n   "))
    sep()
    print("2. Iniciar una sesión de Claude Code y verificar que los hooks se disparan:")
    print("   claude")
    sep()
    print("3. Para activar el flujo Git en un proyecto concreto, añadir a .claude/CLAUDE.md:")
    print("   @~/.claude/git-workflow.md")
    sep()
    print("4. Para ejecutar centinel-update periódicamente (cada ~3 meses) o tras un incidente,")
    print("   invocar la skill en Claude Code: 'ejecuta centinel-update'")
    sep()


# ── Punto de entrada ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap de configuración global de Claude Code")
    parser.add_argument("--check", action="store_true", help="Solo verificar, no instalar")
    parser.add_argument("--force", action="store_true", help="Sobreescribir archivos existentes")
    args = parser.parse_args()

    mode = "VERIFICACIÓN" if args.check else ("INSTALACIÓN FORZADA" if args.force else "INSTALACIÓN")
    print(f"=== BOOTSTRAP CLAUDE CODE CONFIG — {mode} ===")
    sep()

    # ── 1. Requisitos de sistema ────────────────────────────────────────────
    print("1. REQUISITOS DE SISTEMA")
    all_ok = True
    all_ok &= check_python()
    check_claude_code()
    for cmd, display, desc in SYSTEM_OPTIONAL:
        check_system_tool(cmd, display, desc)
    sep()

    if not all_ok:
        err("Python no cumple los requisitos mínimos. Abortar.")
        sys.exit(1)

    # ── 2. Dependencias Python ──────────────────────────────────────────────
    print("2. DEPENDENCIAS PYTHON")
    for import_name, pip_spec, desc in PIP_REQUIRED:
        info(desc)
        installed = check_pip_package(import_name, pip_spec)
        if not installed and not args.check:
            installed = install_pip_package(pip_spec, pip_spec)
        if not installed and args.check:
            warn(f"Falta: pip install {pip_spec}")
    sep()

    if args.check:
        print("3. ARCHIVOS EN ~/.claude/")
        for src_rel, dst_rel in COPY_MAP:
            dst = resolve_dest(dst_rel)
            exists = dst.exists()
            status = "OK" if exists else "FALTA"
            print(f"  [{status}] {dst}")
        sep()
        print("Modo --check completado. Para instalar: python3 bootstrap.py")
        return

    # ── 3. Copiar archivos ──────────────────────────────────────────────────
    print(f"3. ARCHIVOS → {CLAUDE_DIR}")
    if not args.force:
        info("Los archivos existentes NO se sobreescriben (usa --force para forzar)")
    stats = install_files(force=args.force)
    sep()
    info(f"Resumen: {stats['copied']} nuevos, {stats['updated']} actualizados, "
         f"{stats['skipped']} omitidos, {stats['errors']} errores")
    sep()

    # ── 4. Permisos ─────────────────────────────────────────────────────────
    print("4. PERMISOS")
    set_hook_permissions()
    sep()

    # ── 5. Verificación ─────────────────────────────────────────────────────
    print("5. VERIFICACIÓN DEL HOOK")
    verify_hook()
    sep()

    # ── 6. Pasos siguientes ─────────────────────────────────────────────────
    print_next_steps()

    if stats["errors"] > 0:
        warn(f"{stats['errors']} error(es) durante la instalación. Revisar output arriba.")
        sys.exit(1)
    else:
        print("=== INSTALACIÓN COMPLETADA ===")


if __name__ == "__main__":
    main()
