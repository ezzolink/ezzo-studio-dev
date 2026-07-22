; ─────────────────────────────────────────────────────────────────────────────
; EZZO Work Local — Full Custom NSIS Installer
; ─────────────────────────────────────────────────────────────────────────────

Unicode true

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; ── Metadata ──────────────────────────────────────────────────────────────────
!define PRODUCT_NAME      "EZZO Work Local"
!define PRODUCT_VERSION   "{{version}}"
!define PRODUCT_PUBLISHER "EZZO"
!define PRODUCT_URL       "https://ezzo.dev"
!define PRODUCT_EXE       "EZZO Work Local.exe"
!define INSTALL_REG_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name              "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile           "{{installerPath}}"
InstallDir        "$PROGRAMFILES64\EZZO Work Local"
InstallDirRegKey  HKLM "${INSTALL_REG_KEY}" "InstallLocation"
RequestExecutionLevel admin
BrandingText      "EZZO Work Local ${PRODUCT_VERSION}"

; ── MUI Settings ──────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON                      "{{installerIcon}}"
!define MUI_UNICON                    "{{installerIcon}}"
!define MUI_WELCOMEFINISHPAGE_BITMAP  "{{installerSidebar}}"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "{{installerSidebar}}"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP        "{{installerHeaderIcon}}"
!define MUI_HEADERIMAGE_RIGHT

; Cores modernas
!define MUI_BGCOLOR      "0D1117"
!define MUI_TEXTCOLOR    "E6EDF3"

; ── Textos personalizados ──────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE         "Bem-vindo ao ${PRODUCT_NAME}"
!define MUI_WELCOMEPAGE_TEXT          "O ${PRODUCT_NAME} é um IDE colaborativo local que permite editar código, \
gerir ficheiros, executar terminais e trabalhar em equipa na mesma rede.$\r$\n$\r$\n\
✦ Editor de código com sintaxe para 10+ linguagens$\r$\n\
✦ Terminal integrado com suporte a múltiplas sessões$\r$\n\
✦ Colaboração em tempo real via Socket.io$\r$\n\
✦ Explorador de ficheiros com watch automático$\r$\n\
✦ Integração Git com diff visual$\r$\n\
✦ Paleta de comandos (Ctrl+P)$\r$\n\
✦ Temas claro/escuro + cores de destaque$\r$\n\
✦ Chat de equipa integrado$\r$\n$\r$\n\
Clique em Seguinte para continuar."

!define MUI_LICENSEPAGE_TEXT_TOP      "Por favor leia o Contrato de Licença do ${PRODUCT_NAME}."
!define MUI_LICENSEPAGE_BUTTON        "Aceito &os termos"
!define MUI_LICENSEPAGE_CHECKBOX
!define MUI_LICENSEPAGE_CHECKBOX_TEXT "Aceito os termos do Contrato de Licença"

!define MUI_DIRECTORYPAGE_TEXT_TOP    "Escolha a pasta onde o ${PRODUCT_NAME} será instalado.$\r$\nO programa ocupa aproximadamente 200 MB."

!define MUI_INSTFILESPAGE_HEADER_TEXT      "A instalar ${PRODUCT_NAME}"
!define MUI_INSTFILESPAGE_HEADER_SUBTEXT   "Por favor aguarde enquanto os ficheiros são instalados."

!define MUI_FINISHPAGE_TITLE          "Instalação concluída!"
!define MUI_FINISHPAGE_TEXT           "O ${PRODUCT_NAME} foi instalado com sucesso.$\r$\n$\r$\n\
Pode iniciar a aplicação agora ou mais tarde a partir do atalho no Ambiente de Trabalho."
!define MUI_FINISHPAGE_RUN            "$INSTDIR\${PRODUCT_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT       "Iniciar ${PRODUCT_NAME} agora"
!define MUI_FINISHPAGE_SHOWREADME     ""
!define MUI_FINISHPAGE_LINK           "Visitar ezzo.dev"
!define MUI_FINISHPAGE_LINK_LOCATION  "${PRODUCT_URL}"

; ── Páginas ────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE         "{{licenseFile}}"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Desinstalador
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "Portuguese"

; ── Secção de instalação ───────────────────────────────────────────────────────
Section "EZZO Work Local" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Detalhes por etapa
  DetailPrint "A preparar instalação do ${PRODUCT_NAME}…"
  File /r "{{appDir}}\*.*"

  DetailPrint "A registar a aplicação no sistema…"
  WriteRegStr   HKLM "${INSTALL_REG_KEY}" "DisplayName"      "${PRODUCT_NAME}"
  WriteRegStr   HKLM "${INSTALL_REG_KEY}" "DisplayVersion"   "${PRODUCT_VERSION}"
  WriteRegStr   HKLM "${INSTALL_REG_KEY}" "Publisher"        "${PRODUCT_PUBLISHER}"
  WriteRegStr   HKLM "${INSTALL_REG_KEY}" "URLInfoAbout"     "${PRODUCT_URL}"
  WriteRegStr   HKLM "${INSTALL_REG_KEY}" "InstallLocation"  "$INSTDIR"
  WriteRegStr   HKLM "${INSTALL_REG_KEY}" "UninstallString"  '"$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"'
  WriteRegDWORD HKLM "${INSTALL_REG_KEY}" "NoModify"         1
  WriteRegDWORD HKLM "${INSTALL_REG_KEY}" "NoRepair"         1

  ; Calcular tamanho
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${INSTALL_REG_KEY}" "EstimatedSize" "$0"

  DetailPrint "A criar atalhos…"
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut  "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"
  CreateShortcut  "$SMPROGRAMS\${PRODUCT_NAME}\Desinstalar.lnk"     "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
  CreateShortcut  "$DESKTOP\${PRODUCT_NAME}.lnk"                    "$INSTDIR\${PRODUCT_EXE}"

  DetailPrint "A criar desinstalador…"
  WriteUninstaller "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"

  DetailPrint "✓ ${PRODUCT_NAME} instalado com sucesso!"
SectionEnd

; ── Desinstalador ──────────────────────────────────────────────────────────────
Section "Uninstall"
  DetailPrint "A remover ${PRODUCT_NAME}…"
  RMDir /r "$INSTDIR"

  DetailPrint "A remover atalhos…"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"

  DetailPrint "A remover entradas de registo…"
  DeleteRegKey HKLM "${INSTALL_REG_KEY}"

  DetailPrint "✓ ${PRODUCT_NAME} removido."
SectionEnd
