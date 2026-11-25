// Small vector plates: no full-screen texture filters or per-frame scene redraw.
export const surgeon=`<svg class="pulse-surgeon" viewBox="0 0 400 300" aria-hidden="true">
 <defs><linearGradient id="pu-cloth" x2="1" y2="1"><stop stop-color="#494c3f"/><stop offset=".5" stop-color="#242d29"/><stop offset="1" stop-color="#101714"/></linearGradient><linearGradient id="pu-skin"><stop stop-color="#423b30"/><stop offset=".45" stop-color="#a09773"/><stop offset="1" stop-color="#403d30"/></linearGradient><radialGradient id="pu-mask"><stop stop-color="#b7b292"/><stop offset="1" stop-color="#6b7463"/></radialGradient></defs>
 <ellipse cx="202" cy="279" rx="151" ry="18" fill="#050806" opacity=".8"/>
 <g class="pulse-breath"><path d="M66 294 86 186Q97 166 164 152L235 150Q294 162 311 185L335 294Z" fill="url(#pu-cloth)" stroke="#62624b" stroke-width="2"/>
 <path d="m157 156-16 44 38 24-15 64m78-132 15 46-40 23 24 65M99 195l18 96m183-99-19 100" fill="none" stroke="#737360" opacity=".42" stroke-width="3"/>
 <path d="m181 129-8 42 28 40 26-39-12-45" fill="url(#pu-skin)"/><path d="m185 151 14 39 14-39" fill="none" stroke="#302e25" stroke-width="3"/>
 <g class="pulse-head"><path d="M146 64q6-49 51-47 54-3 57 48l-8 52q-7 40-45 44-35-2-44-39Z" fill="url(#pu-skin)"/>
 <path d="m145 62 5-29q46-27 102 5l4 30-33-10-44 2Z" fill="#747866" stroke="#272e25" stroke-width="3"/><path d="m158 42 39-5 43 7" stroke="#aaa68a" fill="none" opacity=".5"/>
 <path d="m158 83 31-8-7 16-20 2m48-15 31 8-6 9-20-3" fill="#252b24"/>
 <path d="m161 85 23-3m29 2 21 4" stroke="#c0b48b" stroke-width="2"/><path d="m198 80-6 28 14 1" fill="none" stroke="#514b38" stroke-width="3"/>
 <path d="m154 106 11 32 35 13 38-15 8-29-45-9Z" fill="url(#pu-mask)" stroke="#384237" stroke-width="2"/><path d="m164 114 72 1m-69 9 63 1m-56 9 47 0" stroke="#515e50" fill="none" opacity=".8"/>
 <path class="pulse-mask-blood" d="m191 117 15 4 10-4 9 15-11 8-6 10-13-6-7-13-9 2 5-12Z" fill="#5e1515"/>
 <path class="pulse-mask-blood extra" d="m167 116 17-7 14 3 15-5 22 8-1 24-22 8-17-5-23-6Z" fill="#78251c"/>
 </g><path d="m93 215-15 62 53 14 22-23-40-9 19-43m169 0 18 61-52 14-23-23 38-10-19-43" fill="url(#pu-cloth)" stroke="#59614f" stroke-width="2"/>
 <path d="m129 267 26-8 25 4 11 15-18 7-38-4m137-14-27-8-24 5-12 14 18 7 38-4" fill="url(#pu-skin)" stroke="#333b2d" stroke-width="2"/>
 <path d="m154 268 23 6m-24 1 21 6m72-14-24 7m25 1-22 6" stroke="#464834" fill="none"/>
 </g></svg>`;
export const hand=`<svg viewBox="0 0 290 105" aria-hidden="true"><defs><linearGradient id="pu-arm"><stop stop-color="#443d34"/><stop offset=".5" stop-color="#aaa082"/><stop offset="1" stop-color="#59553f"/></linearGradient></defs><path d="M0 45 134 34 158 15q7-7 12 1l-7 23 48-10 50 5q14 4 0 9l-41 1 44 2q15 5-1 10l-47-2 42 10q10 8-4 9l-49-11 33 17q7 9-7 9l-55-20-37 4L0 99Z" fill="url(#pu-arm)" stroke="#322c28" stroke-width="2"/><path d="m21 69 65-10 39 2 39-11m-72 10 21-11m22 10 13 8" stroke="#626967" fill="none" opacity=".75" stroke-width="2"/><path d="m105 37 10 39 22-4-10-36Z" fill="#c5bfa4" stroke="#494a3e"/><path d="m113 43 8 0m-6 4 10 0m-9 4 10 0m-8 5 10 0m-8 5 10 0" stroke="#4a534c" stroke-width="2"/><circle cx="81" cy="61" r="6" fill="none" stroke="#af6652" stroke-width="1.5"/></svg>`;
export function syringe(type='hidden'){return `<svg viewBox="0 0 44 112" aria-hidden="true"><path d="M22 81v28" stroke="#c4c8bb" stroke-width="1.5"/><path d="m18 77 2 10h4l2-10" fill="#686f65"/><path d="M12 28h20v48H12Z" fill="${{sterile:'#9aaea0',necrosis:'#171c19',dirty:'#743d32',hidden:'#666f59'}[type]}" stroke="#c0c4aa" stroke-width="2"/><path d="M14 29v43" stroke="#e9e6bc" opacity=".35" stroke-width="3"/><path d="M10 26h24M17 12h10v16H17ZM12 10h20" stroke="#969e8a" fill="#565f52" stroke-width="3"/><path d="M25 37h6m-4 7h4m-6 7h6m-4 7h4m-6 7h6" stroke="#1d2c22" stroke-width="2"/></svg>`;}
