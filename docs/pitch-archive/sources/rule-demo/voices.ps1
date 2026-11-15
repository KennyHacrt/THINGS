Add-Type -AssemblyName System.Speech
$lines=@(
'With Things, just say what needs doing.',
'Find return flights from Hong Kong to Tokyo. Compare the cheapest direct options.',
'Find lunch in Tsim Sha Tsui for under eighty dollars.',
'Catch me up on public Tokyo travel posts.',
'Find papers about retrieval augmented generation.',
'Put everything into a three day Tokyo trip plan.',
'Things. Your little helping hand.'
)
for($i=0;$i -lt $lines.Count;$i++){$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;$s.SelectVoice('Microsoft Zira Desktop');$s.Rate=1;$s.SetOutputToWaveFile((Join-Path $PSScriptRoot ('voice-'+$i+'.wav')));$s.Speak($lines[$i]);$s.Dispose()}
