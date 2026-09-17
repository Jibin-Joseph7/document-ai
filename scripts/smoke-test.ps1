$ErrorActionPreference = "Stop"

$PASS = 0
$FAIL = 0

function Check($Description, $Expected, $Actual) {
    if ($Actual -eq $Expected) {
        Write-Host "  OK   $Description"
        $script:PASS++
    }
    else {
        Write-Host "  FAIL $Description (expected '$Expected', got '$Actual')"
        $script:FAIL++
    }
}

Write-Host "== Document AI Windows Smoke Test =="
Write-Host ""

Write-Host "== Health checks =="

try {
    $ai = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method GET
    Check "AI service healthy" "ok" $ai.status
}
catch {
    Write-Host "  FAIL AI service is not reachable"
    Write-Host $_.Exception.Message
    $script:FAIL++
}

try {
    $node = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
    Check "Node server healthy" "ok" $node.status
}
catch {
    Write-Host "  FAIL Node server is not reachable"
    Write-Host $_.Exception.Message
    $script:FAIL++
}

Write-Host ""
Write-Host "== Auth =="

$email = "smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.com"

$registerBody = @{
    name     = "Smoke Test"
    email    = $email
    password = "supersecret1"
} | ConvertTo-Json

try {
    $registration = Invoke-RestMethod `
        -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody

    $token = $registration.token

    if ($token) {
        Check "registration returned a token" "true" "true"
    }
    else {
        Check "registration returned a token" "true" "false"
        throw "Registration did not return a token."
    }
}
catch {
    Write-Host "Registration failed:"
    Write-Host $_.Exception.Message
    $script:FAIL++
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host ""
Write-Host "== Upload + real ingestion =="

$testFile = Join-Path $PWD "smoke-test.txt"

"Employees are entitled to 20 days of annual leave per year." |
    Set-Content -Path $testFile -Encoding UTF8

try {
    $uploadResponse = & curl.exe `
        -s `
        -X POST "http://localhost:5000/api/documents" `
        -H "Authorization: Bearer $token" `
        -F "file=@$testFile;type=text/plain" `
        -F "title=Smoke Test Document"

    $upload = $uploadResponse | ConvertFrom-Json

    $docId = $upload.document.id
    $status = $upload.document.status

    Check "document ingested successfully" "ready" $status
}
catch {
    Write-Host "Upload failed:"
    Write-Host $_.Exception.Message
    $script:FAIL++
    Remove-Item $testFile -Force -ErrorAction SilentlyContinue
}

if ($docId) {
    Write-Host ""
    Write-Host "== Semantic search =="

    $searchBody = @{
        query = "annual leave"
    } | ConvertTo-Json

    try {
        $search = Invoke-RestMethod `
            -Uri "http://localhost:5000/api/documents/search" `
            -Method POST `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $searchBody

        $found = $false

        foreach ($result in $search.results) {
            if ([int]$result.document_id -eq [int]$docId) {
                $found = $true
                break
            }
        }

        Check "semantic search finds the uploaded document" "true" $found.ToString().ToLower()
    }
    catch {
        Write-Host "Search failed:"
        Write-Host $_.Exception.Message
        $script:FAIL++
    }

    Write-Host ""
    Write-Host "== RAG Q&A =="

    $askBody = @{
        question = "How many days of annual leave?"
    } | ConvertTo-Json

    try {
        $ask = Invoke-RestMethod `
            -Uri "http://localhost:5000/api/documents/$docId/ask" `
            -Method POST `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $askBody

        Check "Q&A returns grounded answer" "extractive" $ask.answer_type
    }
    catch {
        Write-Host "Q&A failed:"
        Write-Host $_.Exception.Message
        $script:FAIL++
    }

    Write-Host ""
    Write-Host "== Summarization =="

    try {
        $summary = Invoke-RestMethod `
            -Uri "http://localhost:5000/api/documents/$docId/summarize" `
            -Method POST `
            -Headers $headers `
            -ContentType "application/json" `
            -Body "{}"

        $hasSummary = $false

        if ($summary.document.summary) {
            if ($summary.document.summary.Length -gt 0) {
                $hasSummary = $true
            }
        }

        Check "summarization persists a non-empty summary" "true" $hasSummary.ToString().ToLower()
    }
    catch {
        Write-Host "Summarization failed:"
        Write-Host $_.Exception.Message
        $script:FAIL++
    }

    Write-Host ""
    Write-Host "== Delete (cross-service cleanup) =="

    try {
        $deleteResponse = & curl.exe `
            -s `
            -o NUL `
            -w "%{http_code}" `
            -X DELETE "http://localhost:5000/api/documents/$docId" `
            -H "Authorization: Bearer $token"

        Check "delete returns 204" "204" $deleteResponse.Trim()
    }
    catch {
        Write-Host "Delete failed:"
        Write-Host $_.Exception.Message
        $script:FAIL++
    }
}

Remove-Item $testFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "== Results: $PASS passed, $FAIL failed =="

if ($FAIL -eq 0) {
    Write-Host "ALL TESTS PASSED"
    exit 0
}
else {
    Write-Host "SOME TESTS FAILED"
    exit 1
}
