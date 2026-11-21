"""Export a built DepLoom site and its SHA-256 catalog for a public mirror."""
import argparse
import gzip
import hashlib
import io
import re
import tarfile
import tempfile
from pathlib import Path


def public_files(root):
    for path in sorted(root.rglob("*")):
        name = path.relative_to(root)
        if (name.parts[0] == "releases" or name.as_posix() == "site-files.sha256"
                or any(part.startswith(".") for part in name.parts)):
            continue
        if path.is_symlink():
            raise ValueError(f"Unexpected symlink in static site: {name}")
        if path.is_dir():
            continue
        if not path.is_file() or not all(re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9._-]*", part)
                                         for part in name.parts):
            raise ValueError(f"Unsupported public file: {name}")
        yield name.as_posix(), path


def export(root, expected=None):
    if not all((root / name).is_file() for name in ("index.html", "tree.html", "plan.html", "audit.html")):
        raise ValueError("Pass the built playground directory containing its public HTML and assets")
    releases = root / "releases"
    if releases.is_symlink():
        raise ValueError("The release directory must be inside the static site")
    files = list(public_files(root))
    manifest = []
    with tempfile.TemporaryDirectory(dir=root, prefix=".playground-release-") as temp:
        archive = Path(temp) / "payload.tar.gz"
        with archive.open("wb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0) as gzip_file:
            with tarfile.open(fileobj=gzip_file, mode="w|", format=tarfile.USTAR_FORMAT) as tar:
                for name, path in files:
                    contents = path.read_bytes()
                    entry = tarfile.TarInfo(name)
                    entry.mode = 0o644
                    entry.size = len(contents)
                    tar.addfile(entry, io.BytesIO(contents))
                    manifest.append(f"{hashlib.sha256(contents).hexdigest()}  {name}\n")
        catalog = "".join(manifest).encode("ascii")
        digest = hashlib.sha256(catalog).hexdigest()
        if expected and digest != expected:
            raise ValueError(f"The exported files differ from the requested release {expected}")
        releases.mkdir(exist_ok=True)
        destination = releases / f"playground-{digest}.tar.gz"
        archive.replace(destination)
        pending = Path(temp) / "site-files.sha256"
        pending.write_bytes(catalog)
        pending.replace(root / pending.name)
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("static_directory", type=Path)
    parser.add_argument("--expected-digest", help="Require this SHA-256 of the asset catalog")
    args = parser.parse_args()
    print(export(args.static_directory, args.expected_digest))
