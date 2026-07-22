; ─────────────────────────────────────────────────────────────────────────────
; EZZO Work Local — Custom NSIS Installer UI
; ─────────────────────────────────────────────────────────────────────────────

!macro customHeader
  !system "echo EZZO Work Local — Custom Installer"
!macroend

; Welcome page: mostrar logo + lista de funcionalidades
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Texto da página de boas-vindas com funcionalidades destacadas
!macro customInstallPage
  ; Já tratado pelo electron-builder via nsis.include
!macroend
