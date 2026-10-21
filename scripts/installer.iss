; =========================================================================
; Windows Fix Wizard - Inno Setup Installer Script
; Author: AhBiYout (CISNet)
; GitHub Repository: https://github.com/AhBiYout-all/windows-fix-wizard
; Official Blog: https://ahbiyoutvibe.blogspot.com/
; Affiliation: https://www.cisnet.co.kr
; =========================================================================

#ifndef MyAppVersion
  #define MyAppVersion "3.12.0"
#endif

#define MyAppName "Windows Fix Wizard"
#define MyAppPublisher "AhBiYout (CISNet)"
#define MyAppURL "https://github.com/AhBiYout-all/windows-fix-wizard"
#define MyAppWebURL "https://ahbiyout-all.github.io/windows-fix-wizard/"
#define MyAppBlogURL "https://ahbiyoutvibe.blogspot.com/"
#define MyAppCompanyURL "https://www.cisnet.co.kr"
#define MyAppAppId "{{8B7853E2-5B4B-4E7B-9A74-BFB075988F80}"
#define MyAppExeName "winfix.cmd"

[Setup]
; App Identity
AppId={#MyAppAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppCompanyURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases

; Default Installation Paths (Unpacked Multi-File)
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\release_assets
OutputBaseFilename=Windows-Fix-Wizard-Setup-v{#MyAppVersion}

; Compression & Architecture
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin

; UI & Branding
WizardStyle=modern
DisableProgramGroupPage=yes
DisableReadyPage=no
ShowLanguageDialog=no

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; Unpacked Multi-File Individual Installation (No bloated docs or portable dumps)
; Individual runtime files and directories unpacked into {app}
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\data\issues.json"; DestDir: "{app}\data"; Flags: ignoreversion onlyifdoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\winfix.cmd"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\winfix.cmd"; Tasks: desktopicon

[Run]
; Silent / Normal Post Install Execution option
Filename: "{app}\winfix.cmd"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent nowait

[Code]
// =========================================================================
// PASCAL CODE SECTION
// 1. Existing Installation Detection & User Confirmation Prompt
// 2. Silent Installation Handling (/SILENT, /VERYSILENT)
// 3. Automated Windows Firewall Inbound Rules Silent Registration
// =========================================================================

function GetInstalledVersion(): String;
var
  UninstallKey: String;
  InstalledVer: String;
begin
  Result := '';
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + '{#MyAppAppId}' + '_is1';
  
  if RegQueryStringValue(HKLM, UninstallKey, 'DisplayVersion', InstalledVer) then
  begin
    Result := InstalledVer;
    Exit;
  end;
  
  if RegQueryStringValue(HKCU, UninstallKey, 'DisplayVersion', InstalledVer) then
  begin
    Result := InstalledVer;
    Exit;
  end;
end;

function IsPreviousVersionInstalled(): Boolean;
var
  PrevVer: String;
begin
  PrevVer := GetInstalledVersion();
  Result := (PrevVer <> '') or DirExists(ExpandConstant('{app}\dist'));
end;

// Existing Version Detection & User Prompt
function InitializeSetup(): Boolean;
var
  PrevVer: String;
  PromptMsg: String;
begin
  Result := True;
  
  // Check if already installed
  if IsPreviousVersionInstalled() then
  begin
    PrevVer := GetInstalledVersion();
    if PrevVer = '' then
      PrevVer := 'Unknown';

    // If running in silent or very silent mode, automatically proceed
    if WizardSilent() then
    begin
      Log('Silent installation detected. Automatically proceeding with overwriting/updating previous version: ' + PrevVer);
      Result := True;
      Exit;
    end;

    // Prompt user for confirmation to overwrite/delete previous installation
    PromptMsg := 
      '기존 설치된 Windows Fix Wizard (v' + PrevVer + ') 가 시스템에 이미 존재합니다.' + #13#10 + #13#10 +
      '이전 버전을 덮어쓰고 최신 버전(v{#MyAppVersion})으로 새로 설치하시겠습니까?' + #13#10 + #13#10 +
      '[예 (Yes)]: 이전 버전을 덮어쓰고 설치를 계속 진행합니다.' + #13#10 +
      '[아니오 (No)]: 설치를 중단하고 마법사를 종료합니다.';

    if MsgBox(PromptMsg, mbConfirmation, MB_YESNO) = IDNO then
    begin
      Log('User chose not to overwrite existing installation. Aborting setup.');
      Result := False;
      Exit;
    end;
  end;
end;

// Silent Windows Firewall Rule Registration
// Registers BOTH:
// 1) Base Name: "Windows Fix Wizard"
// 2) Versioned Name: "Windows Fix Wizard v{#MyAppVersion}"
procedure RegisterFirewallRules();
var
  ResultCode: Integer;
  AppTarget: String;
  RuleBase: String;
  RuleVer: String;
  CmdBase: String;
  CmdVer: String;
begin
  AppTarget := ExpandConstant('{app}\dist\server.cjs');
  RuleBase := 'Windows Fix Wizard';
  RuleVer := 'Windows Fix Wizard v{#MyAppVersion}';

  Log('Registering silent Windows Firewall rules...');

  // Remove duplicate existing rules first to prevent conflict
  Exec('netsh.exe', 'advfirewall firewall delete rule name="' + RuleBase + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('netsh.exe', 'advfirewall firewall delete rule name="' + RuleVer + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // 1. Register Base Name rule
  CmdBase := 'advfirewall firewall add rule name="' + RuleBase + '" dir=in action=allow protocol=TCP localport=3000 enable=yes profile=any description="Windows Fix Wizard Inbound Network Service"';
  if Exec('netsh.exe', CmdBase, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Log('Firewall Base Rule added successfully (Result: ' + IntToStr(ResultCode) + ')')
  else
    Log('Failed to add Firewall Base Rule');

  // 2. Register Versioned Name rule
  CmdVer := 'advfirewall firewall add rule name="' + RuleVer + '" dir=in action=allow protocol=TCP localport=3000 enable=yes profile=any description="Windows Fix Wizard v{#MyAppVersion} Diagnostic Port"';
  if Exec('netsh.exe', CmdVer, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Log('Firewall Versioned Rule added successfully (Result: ' + IntToStr(ResultCode) + ')')
  else
    Log('Failed to add Firewall Versioned Rule');
end;

// Silent Windows Firewall Rules Cleanup on Uninstall
procedure UnregisterFirewallRules();
var
  ResultCode: Integer;
  RuleBase: String;
  RuleVer: String;
begin
  RuleBase := 'Windows Fix Wizard';
  RuleVer := 'Windows Fix Wizard v{#MyAppVersion}';

  Log('Unregistering Windows Firewall rules on uninstall...');
  Exec('netsh.exe', 'advfirewall firewall delete rule name="' + RuleBase + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('netsh.exe', 'advfirewall firewall delete rule name="' + RuleVer + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

// Event Trigger on Post-Install
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    RegisterFirewallRules();
  end;
end;

// Event Trigger on Uninstall
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    UnregisterFirewallRules();
  end;
end;
