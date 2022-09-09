<CsoundSynthesizer>
<CsOptions>
</CsOptions>
<CsInstruments>

sr = 48000
ksmps = 1
nchnls = 1
0dbfs  = 1

instr 1
    aenv = 0.25 * xadsr:a(0.05, 0, 1, 0.95)
    outall(poscil3:a(aenv, 55))
endin

</CsInstruments>
<CsScore>

i1 0 1
e

</CsScore>
</CsoundSynthesizer>
