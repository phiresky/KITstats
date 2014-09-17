### KIT student statistics visualizer

Hosted Version:
http://phiresky.github.io/KITstats/

## Query language

### Types

name|description|examples
---|---|---
num|Number|5, 3, 1.5
fil|Filter|gender:male, subject:mathematics
vec|Vector| [1,2,3], [gender:male, gender:female]

### Operators

Operator|Result|Description|Example
---|---|---|---
num {+,-,/,*} num|num|adds/substracts/... numbers| 3+5 = 8
fil ∩ fil|fil|Combines filters|fachsemester:1 ∩ gender:male = male students in semester 1
vec + num|vec|adds number to all components|[1,2,3]+1 = [2,3,4]
vec ∩ fil|vec|combines filter seperately with all filters in vector|[x,y,z]∩a = [x∩a,y∩a,z∩a]
# fil|num|applies a filter| #gender:male = 123
Σ vec|num|sums a vector| Σ 1,2,3 = 6


## Getting the data
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
