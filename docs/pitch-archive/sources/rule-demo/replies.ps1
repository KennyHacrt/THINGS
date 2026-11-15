Add-Type -AssemblyName System.Speech
$lines=@('On it. I will compare direct flights.','I will find a nearby option within your budget.','I will pull out the useful travel updates.','I will open the abstracts and save a reading list.','I will bring the trip details into a short draft.')
for($i=0;$i -lt $lines.Count;$i++){$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;$s.SelectVoice('Microsoft David Desktop');$s.Rate=1;$s.SetOutputToWaveFile((Join-Path $PSScriptRoot ('reply-'+$i+'.wav')));$s.Speak($lines[$i]);$s.Dispose()}
