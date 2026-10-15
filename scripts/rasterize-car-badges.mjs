import {chromium} from '@playwright/test'
import {readFile,writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
const root=new URL('../public/textures/car/',import.meta.url)
const browser=await chromium.launch({...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']})
try {
  const page=await browser.newPage()
  const png=await page.evaluate(async svg=>{
    const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode()
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048
    canvas.getContext('2d').drawImage(image,0,0)
    return canvas.toDataURL('image/png').split(',')[1]
  },await readFile(new URL('badges.svg',root),'utf8'))
  await writeFile(new URL('badges.png',root),Buffer.from(png,'base64'))
} finally {await browser.close()}
