# Installs the "Planner" Start menu shortcut so Windows offers "Pin to taskbar".
#
# Two things are required for pinning to work correctly:
#   1. The shortcut must live in the Start Menu Programs folder. Windows hides the
#      pin commands for loose shortcuts sitting on the Desktop.
#   2. The shortcut must declare the same AppUserModelID the app sets at runtime
#      (see APP_USER_MODEL_ID in src/main/index.ts). Without it Windows pins the
#      shared electron.exe, and the pinned button never groups with the live window.
#
# Run:  powershell -ExecutionPolicy Bypass -File scripts\install-shortcut.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$appUserModelId = 'com.planner.app'
$projectRoot    = Split-Path -Parent $PSScriptRoot
$electronExe    = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
$iconFile       = Join-Path $projectRoot 'build\icon.ico'
$shortcutPath   = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Planner.lnk'

if (-not (Test-Path $electronExe)) {
    throw "Electron runtime not found at $electronExe. Run 'npm install' first."
}

# Build the shortcut itself. Passing the project root as an argument is what makes
# electron.exe load *this* app rather than its default welcome window.
$shell    = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = $electronExe
$shortcut.Arguments        = "`"$projectRoot`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation     = "$iconFile,0"
$shortcut.Description      = 'Conversational AI goal planner'
$shortcut.Save()

# WScript.Shell cannot write the AppUserModelID, so stamp it through the shell
# property store, which is the only API that exposes it on a .lnk file.
$stampSource = @'
using System;
using System.Runtime.InteropServices;

public static class ShortcutAppId
{
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    private class ShellLink { }

    [ComImport, Guid("0000010b-0000-0000-C000-000000000046"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPersistFile
    {
        void GetClassID(out Guid classId);
        [PreserveSig] int IsDirty();
        void Load([MarshalAs(UnmanagedType.LPWStr)] string fileName, int mode);
        void Save([MarshalAs(UnmanagedType.LPWStr)] string fileName,
                  [MarshalAs(UnmanagedType.Bool)] bool remember);
        void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string fileName);
        void GetCurFile([MarshalAs(UnmanagedType.LPWStr)] out string fileName);
    }

    [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore
    {
        void GetCount(out uint count);
        void GetAt(uint index, out PropertyKey key);
        void GetValue(ref PropertyKey key, IntPtr value);
        void SetValue(ref PropertyKey key, IntPtr value);
        void Commit();
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PropertyKey
    {
        public Guid FormatId;
        public uint PropertyId;
        public PropertyKey(Guid formatId, uint propertyId)
        {
            FormatId = formatId;
            PropertyId = propertyId;
        }
    }

    [DllImport("ole32.dll", PreserveSig = false)]
    private static extern void PropVariantClear(IntPtr propVariant);

    // PKEY_AppUserModel_ID
    private static readonly PropertyKey AppUserModelIdKey = new PropertyKey(
        new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), 5);

    public static void Stamp(string shortcutPath, string appUserModelId)
    {
        object link = new ShellLink();
        // STGM_READWRITE | STGM_SHARE_EXCLUSIVE — the shell link rejects a
        // read-write load that does not also claim exclusive sharing.
        ((IPersistFile)link).Load(shortcutPath, 0x00000002 | 0x00000010);

        IntPtr propVariant = Marshal.AllocCoTaskMem(32);
        try
        {
            // AllocCoTaskMem hands back uninitialized bytes; PropVariantClear
            // would later follow the garbage as if it were a pointer.
            for (int i = 0; i < 32; i++) Marshal.WriteByte(propVariant, i, 0);

            // Fill in a VT_LPWSTR PROPVARIANT by hand: the helper that would do
            // this (InitPropVariantFromString) is a header inline, not an export.
            // The tag sits at offset 0 and the value union starts at offset 8.
            const short VT_LPWSTR = 31;
            Marshal.WriteInt16(propVariant, 0, VT_LPWSTR);
            Marshal.WriteIntPtr(propVariant, 8, Marshal.StringToCoTaskMemUni(appUserModelId));

            IPropertyStore store = (IPropertyStore)link;
            PropertyKey key = AppUserModelIdKey;
            store.SetValue(ref key, propVariant);
            store.Commit();
        }
        finally
        {
            PropVariantClear(propVariant);
            Marshal.FreeCoTaskMem(propVariant);
        }

        // A null path means "save back to the file we loaded from"; passing the
        // path explicitly is rejected while the link is still open read-write.
        ((IPersistFile)link).Save(null, true);
        Marshal.ReleaseComObject(link);
    }
}
'@

if (-not ('ShortcutAppId' -as [type])) {
    Add-Type -TypeDefinition $stampSource -Language CSharp
}
[ShortcutAppId]::Stamp($shortcutPath, $appUserModelId)

Write-Output "Installed: $shortcutPath"
Write-Output "AppUserModelID: $appUserModelId"
