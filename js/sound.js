// ============================================================
// Лёгкая звуковая обратная связь через WebAudio.
// Включается/выключается из настроек.
// ============================================================

export const Sound = {
  ctx: null,
  enabled: true,

  setEnabled(v) {
    this.enabled = v;
  },

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* без звука */ }
    }
    if (this.ctx?.state === "suspended") this.ctx.resume();
  },

  tone(freq, start, dur, gain, slide) {
    const c = this.ctx;
    const osc = c.createOscillator();
    const vol = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + dur);
    vol.gain.setValueAtTime(0.0001, start);
    vol.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    vol.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(vol).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.04);
  },

  play(name) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "tap":   this.tone(540, t, 0.05, 0.025); break;
      case "open":  this.tone(500, t, 0.08, 0.03, 700); break;
      case "save":  this.tone(440, t, 0.1, 0.045, 660); break;
      case "ok":    this.tone(660, t, 0.1, 0.045); this.tone(880, t + 0.09, 0.16, 0.045); break;
      case "err":   this.tone(210, t, 0.16, 0.04, 170); break;
      case "undo":  this.tone(600, t, 0.09, 0.035, 400); break;
    }
  },
};
