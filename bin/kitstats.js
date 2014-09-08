/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/sprintf.d.ts" />
/// <reference path="../lib/d3.d.ts" />
var config = {
    "basename": "data/csv/Statistik_SS2014.pdf-%03d.csv",
    "container": "#outp"
};

$(function () {
    var status = $("#status");
    function log(x) {
        status.text(x);
    }
    var data = [];
    var parsedata = function (data) {
        console.log("parsing");
        console.log(data);
        var statistics = [];
        var statnames = [];
        data.forEach(function (page) {
            var header = page[0][0];
            var match = header.match(/Statistik (\d+) - \((.*)\)/);
            if (match === null)
                return;
            var statid = +match[1];
            statnames[statid] = match[2];
            page.shift(); //remove header
            if (statistics[statid] === undefined)
                statistics[statid] = [];
            statistics[statid].push(page);
        });
        log("Loaded " + statistics.length + " Statistics");
        var drawtable = function (inx) {
            $("<table class=table>").append(statistics[inx].reduce(function (a, b) {
                return a.concat(b);
            }, []).map(function (tr) {
                return $("<tr>").append(tr.map(function (td) {
                    return $("<td>").text(td);
                }));
            })).replaceAll($('> table', config.container));
        };
        $("<select>").append(statnames.map(function (name, inx) {
            return $("<option>").val("" + inx).text(inx + ": " + name);
        })).change(function (evt) {
            drawtable(this.value);
        }).replaceAll($('> select', config.container));
        drawtable(1);
    };
    var getdata = function (pattern, inx) {
        var fname = sprintf(pattern, inx);
        log("Loading page " + inx);
        $.get(fname, function (response) {
            data.push(d3.csv.parseRows(response, function (d) {
                // remove empty lines
                return d.some(function (x) {
                    return x.length > 0;
                }) ? d : false;
            }));
            getdata(pattern, inx + 1);
        }).fail(function (error) {
            if (error.status === 404) {
                parsedata(data);
            } else {
                throw new Error("error getting files: " + error);
            }
        });
    };

    getdata(config.basename, 1);
});
//# sourceMappingURL=kitstats.js.map
