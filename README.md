### KIT student statistics visualizer

Hosted Version:
http://phiresky.github.io/KITstats/

#### Getting the data
* Get the pdfs
```
wget --mirror --include downloads http://www.kit.edu/kit/6407.php --no-host-directories
```
* Extract tables from pdfs (requires [pdf-table-extract](https://github.com/ashima/pdf-table-extract))
```
#!/bin/bash

mkdir -p csv
set -e
for pdf in *.pdf; do
	echo "processing $pdf"
	pages=$(pdfinfo "$pdf" |grep "Pages:"|tr -cd '[:digit:]')
	seq -f "%03g" 1 $pages |
		parallel pdf-table-extract -p {} -i "$pdf" -o "csv/$pdf-{}.csv" -t table_csv
done
```
