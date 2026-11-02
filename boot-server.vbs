Set sh = CreateObject("WScript.Shell")
profile = sh.ExpandEnvironmentStrings("%USERPROFILE%")
node = profile & "\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
script = "C:\Users\Public\dsh-wallpaper\boot-server.mjs"
sh.Run """" & node & """ """ & script & """", 0, False
