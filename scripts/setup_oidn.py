"""Fetch a pinned official OIDN CPU tool, verify its published digest, extract locally."""
import hashlib, pathlib, tarfile, urllib.request
root=pathlib.Path(__file__).resolve().parents[1]/'.cinema-cache'/'tools'
root.mkdir(parents=True,exist_ok=True)
archive=root/'oidn-2.5.1.x86_64.linux.tar.gz'
url='https://github.com/RenderKit/oidn/releases/download/v2.5.1/oidn-2.5.1.x86_64.linux.tar.gz'
expected='743c3e2aff8c220d5d70fe6cb970fb3d36f2702d2693c61d1d148e404cf37cd6'
if not archive.exists():
    with urllib.request.urlopen(url,timeout=120) as source, archive.open('wb') as dest:
        while chunk:=source.read(1024*1024):dest.write(chunk)
actual=hashlib.sha256(archive.read_bytes()).hexdigest()
if actual!=expected:raise SystemExit('OIDN checksum mismatch; tool was not extracted or executed.')
with tarfile.open(archive) as source:source.extractall(root,filter='data')
print(root/'oidn-2.5.1.x86_64.linux'/'bin'/'oidnDenoise')
