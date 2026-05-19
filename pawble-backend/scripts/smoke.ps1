$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$stamp = [int](Get-Date -UFormat %s)

function Show($label, $obj) {
  Write-Host ""
  Write-Host "--- $label ---" -ForegroundColor Cyan
  $obj | ConvertTo-Json -Depth 6
}

# Health
$h = Invoke-RestMethod -Uri "$base/health"
Show 'health' $h

# Metadata (public)
$m = Invoke-RestMethod -Uri "$base/metadata"
Write-Host "species: $($m.species.Count), breeds: $($m.breeds.Count)" -ForegroundColor Green

# Pick a species and breed for our test pets
$species = $m.species | Select-Object -First 1
$breed   = $m.breeds  | Where-Object { $_.speciesId -eq $species.id } | Select-Object -First 1
Write-Host "Using speciesId=$($species.id), breedId=$($breed.id)" -ForegroundColor Yellow

# Register user A
$ua = Invoke-RestMethod -Uri "$base/auth/register" -Method Post -ContentType 'application/json' -Body (@{
  name='Ada'; surname='Lovelace'; email="ada+$stamp@test.dev"; password='secret123'; location='Istanbul'
} | ConvertTo-Json)
Show 'register A' $ua
$tokenA = $ua.token

# Register user B
$ub = Invoke-RestMethod -Uri "$base/auth/register" -Method Post -ContentType 'application/json' -Body (@{
  name='Linus'; surname='Torvalds'; email="linus+$stamp@test.dev"; password='secret123'; location='Helsinki'
} | ConvertTo-Json)
Show 'register B' $ub
$tokenB = $ub.token

# Login A (verify login flow)
$loginA = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body (@{
  email="ada+$stamp@test.dev"; password='secret123'
} | ConvertTo-Json)
Show 'login A' $loginA

# /me with token
$meA = Invoke-RestMethod -Uri "$base/auth/me" -Headers @{ Authorization = "Bearer $tokenA" }
Show 'me A' $meA

# Create pet for A
$petA = Invoke-RestMethod -Uri "$base/pets" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $tokenA" } -Body (@{
  name='Mochi'; speciesId=$species.id; breedId=$breed.id; gender='disi'; age=3; vaccinated=$true; description='Friendly'; goal='mating'
} | ConvertTo-Json)
Show 'pet A' $petA

# Create pet for B
$petB = Invoke-RestMethod -Uri "$base/pets" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $tokenB" } -Body (@{
  name='Bandit'; speciesId=$species.id; breedId=$breed.id; gender='erkek'; age=4; vaccinated=$true; description='Energetic'; goal='mating'
} | ConvertTo-Json)
Show 'pet B' $petB

# List pets for A
$myA = Invoke-RestMethod -Uri "$base/pets/mine" -Headers @{ Authorization = "Bearer $tokenA" }
Show 'pets mine (A)' $myA

# Candidates for A (should see pet B)
$cands = Invoke-RestMethod -Uri "$base/candidates?mode=mating&myPetId=$($petA.id)" -Headers @{ Authorization = "Bearer $tokenA" }
Show 'candidates for A' $cands

# A swipes right on B's pet
$swipe1 = Invoke-RestMethod -Uri "$base/swipes" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $tokenA" } -Body (@{
  likerPetId=$petA.id; likedPetId=$petB.id; action='right'
} | ConvertTo-Json)
Show 'A swipes right on B (expect match=false)' $swipe1

# B swipes right on A's pet → should match
$swipe2 = Invoke-RestMethod -Uri "$base/swipes" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $tokenB" } -Body (@{
  likerPetId=$petB.id; likedPetId=$petA.id; action='right'
} | ConvertTo-Json)
Show 'B swipes right on A (expect match=true)' $swipe2

# Stats for A's pet
$stats = Invoke-RestMethod -Uri "$base/pets/$($petA.id)/stats" -Headers @{ Authorization = "Bearer $tokenA" }
Show 'stats for A pet' $stats

# Send a message from A to B
$msg = Invoke-RestMethod -Uri "$base/messages" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $tokenA" } -Body (@{
  receiverId=$ub.user.id; content='Hi, our pets matched!'
} | ConvertTo-Json)
Show 'message A → B' $msg

# B reads conversations
$convsB = Invoke-RestMethod -Uri "$base/conversations" -Headers @{ Authorization = "Bearer $tokenB" }
Show 'conversations B' $convsB

# B reads messages with A
$msgsB = Invoke-RestMethod -Uri "$base/conversations/$($ua.user.id)/messages" -Headers @{ Authorization = "Bearer $tokenB" }
Show 'messages B↔A (from B view)' $msgsB

# Authorization failure: A tries to delete B's pet (expect 403)
try {
  Invoke-RestMethod -Uri "$base/pets/$($petB.id)" -Method Delete -Headers @{ Authorization = "Bearer $tokenA" } -ErrorAction Stop
  Write-Host "BUG: A was allowed to delete B's pet!" -ForegroundColor Red
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Host "GOOD: cross-user delete blocked with $code" -ForegroundColor Green
}

# Validation failure: short password
try {
  Invoke-RestMethod -Uri "$base/auth/register" -Method Post -ContentType 'application/json' -Body (@{
    name='X'; surname='Y'; email="bad+$stamp@test.dev"; password='123'
  } | ConvertTo-Json) -ErrorAction Stop
  Write-Host "BUG: short password accepted!" -ForegroundColor Red
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Host "GOOD: short password rejected with $code" -ForegroundColor Green
}

Write-Host ""
Write-Host "Smoke test complete." -ForegroundColor Magenta
