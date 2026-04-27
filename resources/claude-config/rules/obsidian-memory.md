# Obsidian Memory

Vault de recuerdos: `__VAULT_PATH__/`

## Al inicio de cada conversación

1. Leé `perfil.md` y `preferencias.md` del vault para saber quién es Val y cómo le gusta trabajar.
2. Determiná en qué proyecto estás basándote en el CWD. Consultá `_meta/projectPaths.md` del vault para mapear el directorio actual a un proyecto.
3. Si hay match, leé el `overview.md` del proyecto y las decisiones recientes.
4. Si no hay match y el CWD es un proyecto nuevo, creá el overview y agregá el path a `_meta/projectPaths.md` automáticamente.
Si no hay match y no es un proyecto (ej: sesión desde `~`), usá solo el contexto global.

## Durante la conversación

SIEMPRE que detectes información valiosa, escribila en el vault SIN esperar a que Val te lo pida. Esto incluye:
- Preferencias de trabajo, decisiones de estilo, cosas que le molestan
- Decisiones arquitectónicas o técnicas con su contexto
- Aprendizajes de debugging, soluciones no obvias
- Contexto de proyecto: qué es, quién trabaja, estado, stack
- Correcciones que Val te hace (feedback)
- Info sobre Val: su rol, background, responsabilidades

Hacelo en el momento — no acumules para el final de la sesión.
Si Val te pide explícitamente que recuerdes algo, también.
Si algo que ya guardaste cambió, buscá la nota y actualizala.

Para escribir o actualizar notas: invocá la skill `/remember`.
