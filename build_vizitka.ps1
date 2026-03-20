$photoBytes = [System.IO.File]::ReadAllBytes('c:\Users\geori\OneDrive\Documentos\projects\photo_2023-05-30_21-54-57 (2).jpg')
$b64 = [Convert]::ToBase64String($photoBytes)
$dataUri = "data:image/jpeg;base64,$b64"

$template = [System.IO.File]::ReadAllText('c:\Users\geori\OneDrive\Documentos\projects\my-first-project\template.html', [System.Text.Encoding]::UTF8)
$result = $template.Replace('__PHOTO__', $dataUri)

[System.IO.File]::WriteAllText('c:\Users\geori\OneDrive\Documentos\projects\my-first-project\vizitka.html', $result, [System.Text.Encoding]::UTF8)
Write-Host "OK"
