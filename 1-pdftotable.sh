#!/bin/bash

mkdir -p csv
set -e
for pdf in *.pdf; do
	echo "processing $pdf"
	pages=$(pdfinfo "$pdf" |grep "Pages:"|tr -cd '[:digit:]')
	#for i in $(seq -f "%03g" 1 $pages); do
	#	echo "extracting page $i from $pdf"
	seq -f "%03g" 1 $pages |
		parallel pdf-table-extract -p {} -i "$pdf" -o "csv/$(basename "$pdf")-{}.csv" -t table_csv
done
