var EqParser;
(function (_EqParser) {
    (function (TokenType) {
        TokenType[TokenType["INVALID"] = 0] = "INVALID";
        TokenType[TokenType["LBRACKET"] = 1] = "LBRACKET";
        TokenType[TokenType["LPAREN"] = 2] = "LPAREN";
        TokenType[TokenType["LBRACE"] = 3] = "LBRACE";
        TokenType[TokenType["RBRACKET"] = 4] = "RBRACKET";
        TokenType[TokenType["RPAREN"] = 5] = "RPAREN";
        TokenType[TokenType["RBRACE"] = 6] = "RBRACE";
        TokenType[TokenType["IDENTIFIER"] = 7] = "IDENTIFIER";
        TokenType[TokenType["OPERATOR"] = 8] = "OPERATOR";
        TokenType[TokenType["NUMBER"] = 9] = "NUMBER";
        TokenType[TokenType["COMMA"] = 10] = "COMMA";
    })(_EqParser.TokenType || (_EqParser.TokenType = {}));
    var TokenType = _EqParser.TokenType;
    var Token = (function () {
        function Token(val, begin, end, type) {
            this.val = val;
            this.begin = begin;
            this.end = end;
            this.type = type;
        }
        Token.prototype.toString = function () {
            return TokenType[this.type] + ": " + this.val;
        };
        Token.prototype.is = function () {
            var arr = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                arr[_i] = arguments[_i + 0];
            }
            return arr.indexOf(this.type) >= 0;
        };
        Token.prototype.isAny = function (arr) {
            return arr.indexOf(this.type) >= 0;
        };
        return Token;
    })();
    _EqParser.Token = Token;
    var Operator = (function () {
        function Operator(precedence, options) {
            if (typeof options === "undefined") { options = {}; }
            var _this = this;
            this.precedence = precedence;
            this.options = options;
            this.unary = false;
            this.rightAss = false;
            this.prefix = false;
            this.postfix = false;
            ["rightAss", "unary", "postfix", "prefix"].forEach(function (x) {
                return _this[x] = !!options[x];
            });
        }
        Operator.operators = {
            // also add new ops in "regexes below"
            '+': new Operator(4),
            '-': new Operator(4),
            '*': new Operator(5),
            '/': new Operator(5),
            '&': new Operator(3),
            ',': new Operator(2),
            '#': new Operator(5, { unary: true, postfix: true }),
            'Σ': new Operator(1, { unary: true, prefix: true })
        };
        Operator.aliases = [
            { a: /∩/g, b: "&" }
        ];
        return Operator;
    })();
    _EqParser.Operator = Operator;
    var EqParser = (function () {
        function EqParser(inp) {
            this.pos = 0;
            Operator.aliases.forEach(function (r) {
                return inp = inp.replace(r.a, r.b);
            });
            this.inp = inp;
        }
        EqParser.prototype.hasTokens = function () {
            return this.pos < this.inp.length;
        };

        EqParser.prototype.readToken = function () {
            while (" \t\r\n".indexOf(this.inp[this.pos]) >= 0)
                this.pos++;
            var subinp = this.inp.substr(this.pos);
            var token;
            var regexes = [
                [/^[0-9]+/, 9 /* NUMBER */],
                [/^[a-z][a-z0-9_]*(:\s*[äöüßa-z0-9_]+)?/i, 7 /* IDENTIFIER */],
                [/^\(/, 2 /* LPAREN */],
                [/^\[/, 1 /* LBRACKET */],
                [/^\{/, 3 /* LBRACE */],
                [/^\)/, 5 /* RPAREN */],
                [/^\]/, 4 /* RBRACKET */],
                [/^\}/, 6 /* RBRACE */]
            ];
            regexes.push([
                new RegExp("^[" + Object.keys(Operator.operators).map(function (x) {
                    return x.replace(/[-\]]/g, "\\$&");
                }).join("") + "]"),
                8 /* OPERATOR */]);
            for (var i = 0; i < regexes.length; i++) {
                var match = subinp.match(regexes[i][0]);
                if (match) {
                    token = new Token(this.inp.substring(this.pos, this.pos + match[0].length), this.pos, this.pos + match[0].length, regexes[i][1]);
                    this.pos += match[0].length;
                    break;
                }
            }
            if (!token) {
                token = new Token(this.inp[this.pos], this.pos, ++this.pos, 0 /* INVALID */);
            }
            return token;
        };

        EqParser.prototype.interpret = function () {
            var queue = [];
            var stack = [];
            function peek() {
                if (stack.length > 0)
                    return stack[stack.length - 1];
            }
            while (this.hasTokens()) {
                var token = this.readToken();
                if (token.is(9 /* NUMBER */, 7 /* IDENTIFIER */))
                    queue.push(token);
                else if (token.is(2 /* LPAREN */, 3 /* LBRACE */, 1 /* LBRACKET */))
                    stack.push(token);
                else if (token.is(10 /* COMMA */)) {
                    while (!peek().is(3 /* LBRACE */)) {
                        queue.push(stack.pop());
                    }
                } else if (token.is(8 /* OPERATOR */)) {
                    var op = Operator.operators[token.val];
                    while (stack.length > 0) {
                        var top = peek();
                        var op2 = Operator.operators[top.val];
                        if (top.is(8 /* OPERATOR */) && (!op.unary || op2.unary) && ((!op.rightAss && op.precedence <= op2.precedence) || op.precedence < op2.precedence)) {
                            queue.push(stack.pop());
                        } else
                            break;
                    }
                    stack.push(token);
                } else if (token.is(5 /* RPAREN */, 6 /* RBRACE */, 4 /* RBRACKET */)) {
                    while (!peek().is(2 /* LPAREN */, 3 /* LBRACE */, 1 /* LBRACKET */))
                        queue.push(stack.pop());
                    stack.pop();
                } else
                    throw new Error("Unknown Token: " + token.toString());
            }
            while (stack.length > 0) {
                if (!peek().is(8 /* OPERATOR */))
                    throw new Error("invalid token remaining: " + peek().toString());
                else
                    queue.push(stack.pop());
            }
            return queue;
        };

        EqParser.parse = function (inp) {
            return new EqParser(inp).interpret();
        };
        return EqParser;
    })();
    _EqParser.EqParser = EqParser;
})(EqParser || (EqParser = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Operand = (function () {
    function Operand(type) {
        this.type = type;
    }
    Operand.make = function (cont, token) {
        if (token.is(7 /* IDENTIFIER */)) {
            var split = token.val.split(":");
            if (split.length !== 2)
                throw new Error("invalid identifier " + token.val);
            return cont.findFilter(split[0], split[1]);
        }
        if (token.is(9 /* NUMBER */))
            return new NumberOp(+token.val);
    };
    Operand.prototype.doQuery = function (cont) {
        throw new Error("No doQuery on " + this.type);
    };
    Operand.prototype.getQuery = function () {
        throw new Error("No getQuery on " + this.type);
    };

    Operand.prototype.toString = function () {
        return this.getQuery();
    };
    return Operand;
})();

var GraphInfo = (function () {
    function GraphInfo() {
        this.ytitle = "Studenten";
    }
    return GraphInfo;
})();

var Filter = (function (_super) {
    __extends(Filter, _super);
    function Filter() {
        _super.call(this, "filter");
    }
    Filter.prototype.doQuery = function (cont) {
        return cont.get(this);
    };
    return Filter;
})(Operand);

var NumberOp = (function (_super) {
    __extends(NumberOp, _super);
    function NumberOp(val) {
        _super.call(this, "number");
        this.val = val;
    }
    NumberOp.prototype.doQuery = function (cont) {
        return this.val;
    };
    NumberOp.prototype.toString = function () {
        return this.val + "";
    };
    return NumberOp;
})(Operand);

var SingleFilter = (function (_super) {
    __extends(SingleFilter, _super);
    function SingleFilter(category, value) {
        _super.call(this);
        this.category = category;
        this.value = value;
    }
    SingleFilter.prototype.getQuery = function () {
        return this.category + ":" + this.value;
    };
    return SingleFilter;
})(Filter);

// like a filter, but has numerical values allowing addition
var DiscreteFilter = (function (_super) {
    __extends(DiscreteFilter, _super);
    function DiscreteFilter(discrete, value, numval) {
        _super.call(this, discrete.name, value);
        this.discrete = discrete;
        this.numval = numval;
    }
    return DiscreteFilter;
})(SingleFilter);

// a category of discrete filters
var Discrete = (function () {
    function Discrete(name, max, names) {
        this.name = name;
        this.max = max;
        this.names = names;
    }
    Discrete.prototype.getByValue = function (val) {
        if (val < 0 || val > this.max)
            throw new Error(this.name + " out of bounds: " + val);
        return new DiscreteFilter(this, this.names[val], val);
    };
    Discrete.prototype.getByName = function (name) {
        return this.getByValue(this.names.indexOf(name.trim()));
    };
    Discrete.prototype.getAll = function () {
        var arr = [];
        for (var i = 0; i <= this.max; i++)
            arr.push(this.getByValue(i));
        return arr;
    };
    return Discrete;
})();

var NoFilter = (function (_super) {
    __extends(NoFilter, _super);
    function NoFilter() {
        _super.call(this);
    }
    NoFilter.prototype.getQuery = function () {
        return "";
    };
    return NoFilter;
})(Filter);

var CombinedFilter = (function (_super) {
    __extends(CombinedFilter, _super);
    function CombinedFilter() {
        var filters = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            filters[_i] = arguments[_i + 0];
        }
        _super.call(this);
        this.filters = filters;
    }
    CombinedFilter.prototype.getQuery = function () {
        return this.filters.map(function (f) {
            return f.getQuery();
        }).join("&");
    };
    CombinedFilter.prototype.doQuery = function () {
        return cont.get(this);
    };
    return CombinedFilter;
})(Filter);

var OperandVector = (function (_super) {
    __extends(OperandVector, _super);
    function OperandVector(ops) {
        _super.call(this, "vector");
        this.ops = ops;
    }
    OperandVector.prototype.doQuery = function (cont) {
        return this.ops.map(function (op) {
            return op.doQuery(cont);
        });
    };

    // nobody will ever understand this again
    OperandVector.prototype.getGraphInfo = function (cont) {
        var _this = this;
        if (this.ops.some(function (op) {
            return !(op instanceof Filter);
        })) {
            return new GraphInfo();
        }
        var reduceFilter = function (vec, filter) {
            var arr = [filter];
            if (filter instanceof CombinedFilter)
                arr = filter.filters.reduce(reduceFilter, []);
            if (filter instanceof OperandVector)
                arr = filter.ops.reduce(reduceFilter, []);
            return vec.concat(arr);
        };
        var filters = this.ops.map(function (op) {
            return reduceFilter([], op);
        });
        var occurrences = {};
        filters.forEach(function (fs) {
            return fs.forEach(function (f) {
                var fstr = f.toString();
                if (!(fstr in occurrences))
                    occurrences[fstr] = { filter: f, count: 1 };
                else
                    occurrences[fstr].count++;
            });
        });

        // filters that exist on all elements
        var all = Object.keys(occurrences).filter(function (key) {
            return occurrences[key].count == _this.ops.length;
        }).map(function (key) {
            return occurrences[key].filter;
        });
        console.log(this.ops.length);
        filters = filters.map(function (fs) {
            return fs.filter(function (f) {
                return all.indexOf(f) < 0;
            });
        });
        var xtitle = undefined;
        var subtitle = undefined;
        var xaxis = undefined;
        var title = all.length > 0 ? all.map(function (f) {
            return sprintf("%(cat)s: %(val)s", cont.stringify(f));
        }).join(", ") : undefined;

        // if all filters are single and have the same category
        var allcat = filters[0][0].category;
        if (filters.every(function (f) {
            return f.length == 1 && f[0].category == allcat;
        })) {
            xtitle = cont.stringify(filters[0][0]).cat;
            if (title === undefined)
                title = xtitle;
            else
                subtitle = "nach " + xtitle;
            xaxis = filters.map(function (f) {
                return cont.stringify(f[0]).val;
            });
        } else
            xaxis = filters.map(function (fs) {
                return fs.map(function (f) {
                    var v = cont.stringify(f);
                    return v.cat + ": " + v.val;
                }).join(" ∩ ");
            });
        return {
            title: title,
            subtitle: subtitle,
            xaxis: xaxis,
            xtitle: xtitle,
            ytitle: "Studenten"
        };
    };
    return OperandVector;
})(Operand);

var operators = {
    "filter&filter": function (v1, v2) {
        return new CombinedFilter(v1, v2);
    },
    "number+number": function (v1, v2) {
        return new NumberOp(v1.val + v2.val);
    },
    "number-number": function (v1, v2) {
        return new NumberOp(v1.val - v2.val);
    },
    "number/number": function (v1, v2) {
        return new NumberOp(v1.val / v2.val);
    },
    "number*number": function (v1, v2) {
        return new NumberOp(v1.val * v2.val);
    },
    "filter+number": function (filter, num) {
        if (!(filter instanceof DiscreteFilter))
            throw new Error("Cannot add number to non-discrete filter");
        return filter.discrete.getByValue(filter.numval + num.val);
    },
    "filter#": function (v) {
        return new NumberOp(v.doQuery(cont));
    },
    "vectorΣ": function (v) {
        return v.ops.reduce(function (f1, f2) {
            return doOperator(f1, '+', f2);
        });
    }
};
function getOperator(v1, op, v2) {
    var opid = v1.type + op + v2.type;
    if (operators.hasOwnProperty(opid))
        return operators[opid];
    if (op === ",") {
        return function (v1, v2) {
            var left = v1.type === "vector" ? v1.ops : [v1];
            var right = v2.type === "vector" ? v2.ops : [v2];
            return new OperandVector(left.concat(right));
        };
    }
    if (v1.type === "vector") {
        return function (v1, v2) {
            return new OperandVector(v1.ops.map(function (f) {
                return doOperator(f, op, v2);
            }));
        };
    } else if (v1.type !== "vector" && v2.type === "vector") {
        return function (v1, v2) {
            return new OperandVector(v2.ops.map(function (f) {
                return doOperator(v1, op, f);
            }));
        };
    }
}

// warning: operators do not guarantee
function doOperator(v1, op, v2) {
    var opfn = getOperator(v1, op, v2);
    if (!opfn)
        throw new Error("Can't apply '" + op + "' to " + v1.type + " and " + v2.type);
    return opfn(v1, v2);
}
var TUtil = {
    nth_col: function (data, col) {
        return data.map(function (row) {
            return row[col];
        });
    },
    no_nth_col: function (data, col) {
        return data.map(function (row) {
            return row.slice(0, col).concat(row.slice(col + 1));
        });
    },
    /// submatrix from x to x2 (upper exclusive)
    sub: function (data, x, y, x2, y2) {
        return data.slice(y, y2).map(function (row) {
            return row.slice(x, x2);
        });
    }
};

var KITParser = (function () {
    function KITParser() {
    }
    KITParser.parse = function (ct, statnames, data) {
        ct.cat_aliases = {
            "geschlecht": "gender"
        };
        ct.val_aliases = {
            gender: {
                aliases: { "männlich": "male" },
                readable_vals: { male: "Männlich", female: "Weiblich" },
                readable: "Geschlecht"
            },
            fachsemester: {
                discrete: new Discrete("fachsemester", 12, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", ">12"]),
                aliases: {}, readable: "Fachsemester",
                readable_vals: {}
            },
            abschlussziel: {
                aliases: { "Diplom (U)": "diplom" },
                readable: "Abschlussziel",
                readable_vals: {}
            },
            status: {
                readable: "Status",
                aliases: { "erstimmatr.": "erst", "neuimmatr.": "neu", "rückmelder": "rueck" },
                readable_vals: {
                    beurlaubt: "Beurlaubt",
                    "erst": "Erstimmatrikuliert",
                    "neu": "Neuimmatrikuliert",
                    "rueck": "Rückmelder"
                }
            },
            foreign: {
                readable: " ",
                aliases: {},
                readable_vals: { "no": "Deutsch", "yes": "Ausländisch" }
            }
        };

        //Gesamtstatistik (1)
        var s1 = data[0][0];
        s1 = s1.slice(2, 11); //ignore studienkolleg for now
        s1 = s1.filter(function (r) {
            return r[0].length > 0;
        });
        var yfilter = TUtil.nth_col(s1, 0).map(function (x) {
            return ct.findFilter("Status", x);
        });
        var xfilter = ["", "gender:male", "gender:female", "foreign:no&geschlecht:männlich", "foreign:no&gender:female", "foreign:no", "foreign:yes&gender:male", "foreign:yes&gender:female", "foreign:yes"].map(function (x) {
            return queryToOperand(x);
        });
        ct.putAll(xfilter, yfilter, s1, 1, 0);

        // Abschlussziele
        var s2 = data[1][0];
        ct.putAllCat("Fachsemester", "Abschlussziel", s2.slice(1));

        // Studienfach
        var s3 = data[2].reduce(function (p1, p2) {
            return p1.concat(p2);
        });
        while (s3[s3.length - 1][1] !== "Insgesamt")
            s3.pop();
        s3 = s3.filter(function (row) {
            return row[1].trim().length > 0;
        }); //ignore fakultät
        s3 = TUtil.no_nth_col(s3, 5);
        var yfilter = s3.slice(1).map(function (row) {
            return ct.findFilter("Fach", row[1]);
        });
        var xfilter = [new NoFilter()].concat(["status:rückmelder", "status:erstimmatr.", "status_neuimmatr:1fsem", "status_neuimmatr:hsem"].map(function (x) {
            return ct.findFilter(x.split(":")[0], x.split(":")[1]);
        })).concat([
            "foreign:no&gender:male", "foreign:no&gender:female", "foreign:no", "foreign:yes&gender:male", "foreign:yes&gender:female", "foreign:yes",
            "status:beurlaubt"].map(function (x) {
            return queryToOperand(x);
        }));
        ct.putAll(xfilter, yfilter, s3, 4, 1);
        return ct;
    };
    return KITParser;
})();
// represents a multidimensional contingency table
// currently only maps data values/categories
var Contingency = (function () {
    function Contingency() {
        this.global_val_jargon = {
            "Insgesamt": "",
            "Gesamt": ""
        };
        this.cat_aliases = Object.create(null);
        this.val_aliases = Object.create(null);
        this.dict = Object.create(null);
        // map from category to values
        this.cats = Object.create(null);
    }
    Contingency.prototype.has = function (query) {
        return Object.hasOwnProperty.call(this.dict, query);
    };

    Contingency.prototype.put = function (filter, data) {
        var query = this.normalize(filter.getQuery(), true);
        if (this.has(query)) {
            if (this.dict[query] !== data)
                console.warn(sprintf("Warn: overwriting %s=%d with %d", query, this.dict[query], data));
            //else console.debug("consistent double entry of "+query+data+"+" +this.dict[query]);
        }
        this.dict[query] = data;
    };

    Contingency.prototype.putAll = function (xfilters, yfilters, data, xoffset, yoffset) {
        for (var y = 0; y < yfilters.length; y++)
            for (var x = 0; x < xfilters.length; x++) {
                this.put(doOperator(xfilters[x], "&", yfilters[y]), +data[y + yoffset][x + xoffset]);
            }
    };

    Contingency.prototype.putAllCat = function (xcategory, ycategory, data) {
        var xfilters = [], yfilters = [];
        for (var y = 1; y < data.length; y++) {
            yfilters[y - 1] = this.findFilter(ycategory, data[y][0]);
        }
        for (var x = 1; x < data[0].length; x++) {
            xfilters[x - 1] = this.findFilter(xcategory, data[0][x]);
        }
        this.putAll(xfilters, yfilters, data, 1, 1);
    };

    Contingency.prototype.findFilter = function (readable_category, readable_value) {
        var norm_category = readable_category.toLocaleLowerCase();
        if (readable_category in this.cat_aliases) {
            norm_category = this.cat_aliases[readable_category];
            if (norm_category.replace(/[^a-z0-9]+/g, "_") !== norm_category) {
                throw new Error("Category " + norm_category + " is not normalized");
            }
        }
        norm_category = norm_category.replace(/[^a-z0-9]+/g, "_");
        var norm_value = readable_value.toLocaleLowerCase();
        if (readable_value in this.global_val_jargon)
            norm_value = this.global_val_jargon[readable_value];
        if (norm_value === "all")
            return new OperandVector(this.getAll(norm_category));
        norm_value = norm_value.replace(/[^a-z0-9]+/g, "_");
        if (norm_value.length == 0 || norm_category.length == 0)
            return new NoFilter();
        if (norm_category in this.val_aliases) {
            var catinfo = this.val_aliases[norm_category];
            if (readable_value in catinfo.aliases) {
                norm_value = catinfo.aliases[readable_value];
                if (norm_value.replace(/[^a-z0-9]+/g, "_") !== norm_value)
                    throw new Error("Value " + norm_value + " is not normalized");
            }
            if (catinfo.discrete) {
                return catinfo.discrete.getByName(readable_value);
            }
        }

        if (!(norm_category in this.val_aliases)) {
            this.val_aliases[norm_category] = {
                readable: readable_category,
                readable_vals: {},
                aliases: {}
            };
        }
        var tmp = this.val_aliases[norm_category].readable_vals;
        tmp[norm_value] = tmp[norm_value] || readable_value;
        return new SingleFilter(norm_category, norm_value);
    };

    Contingency.prototype.getAll = function (category) {
        var _this = this;
        if (this.val_aliases[category] && this.val_aliases[category].discrete) {
            return this.val_aliases[category].discrete.getAll();
        } else
            return Object.keys(this.cats[category]).map(function (val) {
                if (val === "all")
                    throw new Error("!pvouf3");
                return _this.findFilter(category, val);
            });
    };

    Contingency.prototype.stringify = function (filter) {
        var cat = filter.category;
        var val = filter.value;
        if (cat in this.val_aliases) {
            var info = this.val_aliases[filter.category];
            cat = info.readable || cat;
            val = info.readable_vals[val] || val;
        }
        return { cat: cat, val: val };
    };

    // normalize list and add values to this.cats
    Contingency.prototype.normalize = function (filters, addvalstocats) {
        var _this = this;
        if (typeof addvalstocats === "undefined") { addvalstocats = false; }
        if (filters.length == 0)
            return "";
        var split = filters.split(/&+/).filter(function (x) {
            return x.length > 0;
        }).map(function (x) {
            var sp = x.trim().split(":");
            var cat = sp[0];
            var val = sp[1];
            if (cat.length == 0 || val.length == 0)
                return "";
            if (addvalstocats) {
                _this.cats[cat] = _this.cats[cat] || Object.create(null);
                _this.cats[cat][val] = true;
            }
            return cat + ":" + val;
        }).filter(function (x) {
            return x.length > 0;
        });
        return split.sort().join('&');
    };

    Contingency.prototype.get = function (filter) {
        var query = this.normalize(filter.getQuery());
        if (!this.has(query))
            throw new Error("INSUFFICIENT DATA FOR MEANINGFUL ANSWER " + filter.toString());
        return this.dict[this.normalize(filter.getQuery())];
    };
    return Contingency;
})();
/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/sprintf.d.ts" />
/// <reference path="../lib/d3.d.ts" />
/// <reference path="../lib/highcharts.d.ts" />
/// <reference path="eqparser.ts" />
/// <reference path="filters.ts" />
/// <reference path="kitparser.ts" />
/// <reference path="contingency.ts" />
var config = {
    "filenames": ["data/csv/Studierende_2014_1HJ.csv"],
    //"basename":"data/csv/Statistik_SS2014.pdf-%03d.csv",
    "container": "#outp",
    "headlines": [2, 2, 2, 3, 2, 3, 999, 2, 2, 2, 2]
};

// parsed url parameter map
var urlParameters = {};
var LANG = navigator.language || navigator.userLanguage || "de";

function parseParameters() {
    var params = Object.create(null);
    if (location.hash.length == 0)
        return params;
    location.hash.substr(1).split("&").forEach(function (param) {
        var split = param.split("=");
        var attr = decodeURIComponent(split[0]);
        if (param.length == 1)
            params[attr] = null;
        else
            params[attr] = decodeURIComponent(split[1]);
    });
    return params;
}
function setParameters() {
    console.log("setting params");
    location.hash = Object.keys(urlParameters).map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(urlParameters[key]);
    }).join("&");
}

function mostlyequals(a, b) {
    var ignore = /[^A-Za-z0-9]/g;
    return a.join('').replace(ignore, '') === b.join('').replace(ignore, '');
}

function toTable(arr, header) {
    if (typeof header === "undefined") { header = false; }
    return arr.map(function (tr) {
        return $("<tr>").append(tr.map(function (td) {
            return $(header ? "<th>" : "<td>").text(td);
        }));
    });
}

function queryToOperand(eq) {
    return makeQuery(EqParser.EqParser.parse(eq));
}

function visualizeOutput(input, output) {
    var outp = $("#eqoutput");
    if ($.isArray(output)) {
        var multidim = $.isArray(output[0]);
        if (!multidim)
            output = [output];

        //console.log(_a=output);
        console.log(input.ops[0]);

        //if(multidim) output = output[0].map((x,i) => output.map(y => y[i]));
        console.log(_a = output);
        var graphInfo = input.getGraphInfo(cont);
        if (multidim) {
            graphInfo = input.ops[0].getGraphInfo(cont);
            if (graphInfo.title)
                graphInfo.title = graphInfo.title.split(":")[0]; //TODO
        }
        var chart = outp.highcharts({
            chart: { type: 'column' },
            title: { text: graphInfo.title },
            subtitle: { text: graphInfo.subtitle },
            xAxis: {
                categories: graphInfo.xaxis,
                title: { text: graphInfo.xtitle }
            },
            yAxis: { min: 0, title: { text: graphInfo.ytitle } },
            tooltip: {
                formatter: function () {
                    return this.points[0].key;
                },
                shared: true
            },
            plotOptions: {
                column: { showInLegend: multidim }
            },
            series: output.map(function (s, i) {
                return ({ data: s, name: multidim ? input.ops[i].getGraphInfo(cont).title : graphInfo.xtitle });
            })
        });
    } else if (output instanceof Error) {
        outp.text(output).append($("<pre>").text(output.stack));
    } else
        outp.text(output);
}

function makeQuery(queue) {
    var args = [];
    while (queue.length > 0) {
        if (queue[0].is(8 /* OPERATOR */)) {
            var arg2 = args.pop();
            var op = queue.shift().val;
            if (EqParser.Operator.operators[op].unary)
                args.push(doOperator(arg2, op, new Operand("")));
            else {
                if (args.length == 0)
                    throw new Error("Invalid argument count: " + args.length);
                var arg1 = args.pop();
                args.push(doOperator(arg1, op, arg2));
            }
        } else
            args.push(Operand.make(cont, queue.shift()));
    }
    if (args.length > 1)
        throw new Error("Invalid arguments remaining at end");
    if (args.length == 0)
        args = [new NoFilter()];
    return args.pop();
}

var data = [];
var cont;

$(function () {
    urlParameters = parseParameters();
    if ("q" in urlParameters)
        $("#equation").val(urlParameters["q"]);
    $("#equation").keyup(function (evt) {
        return evt.keyCode == 13 && $("#parseeq").click();
    });
    var status = $("#status");
    function log(x) {
        status.text(x);
    }
    $("#onclickquery a").click(function (e) {
        $("#equation").val(e.target.textContent);
        $("#parseeq").click();
        return false;
    });
    var parsedata = function (data) {
        console.log("parsing");
        var statistics = [];
        var statnames = [];
        data.forEach(function (page) {
            var header = page[0][0];
            var match = header.match(/Statistik (\d+) - \((.*)\)/);
            if (match === null)
                return;
            var statid = +match[1] - 1;
            statnames[statid] = match[2];
            page.shift(); //remove header
            if (statistics[statid] === undefined) {
                statistics[statid] = [page];
            } else
                statistics[statid].push(page.slice(config.headlines[statid]));
        });
        log("Loaded " + statistics.length + " Statistics");
        var drawtable = function (inx) {
            if (isNaN(+inx))
                $("<table>").replaceAll($('> table', config.container));
            else
                $("<table class=table>").append(toTable(statistics[inx].reduce(function (a, b) {
                    return a.concat(b);
                }, []))).replaceAll($('> table', config.container));
        };
        $("<select>").append("<option>Tabelle anzeigen</option>").append(statnames.map(function (name, inx) {
            return $("<option>").val("" + inx).text(inx + ": " + name);
        })).change(function (evt) {
            drawtable(this.value);
        }).replaceAll($('> select', config.container));
        cont = new Contingency();
        KITParser.parse(cont, statnames, statistics);
    };
    var getpageddata = function (pattern, inx) {
        var fname = sprintf(pattern, inx);
        log("Loading page " + inx);
        $.get(fname, function (response) {
            data.push(d3.csv.parseRows(response, function (d) {
                return d.some(function (x) {
                    return x.length > 0;
                }) ? d : false;
            }));
            getpageddata(fname, pattern, inx + 1);
        }).fail(function (error) {
            if (error.status === 404) {
                parsedata(data);
            } else {
                throw new Error("error getting files: " + error);
            }
        });
    };
    var getsingledata = function (fname) {
        log("Loading");
        $.get(fname, function (response) {
            return parsedata(response.split("\n§PAGEBREAK\n").map(function (page) {
                return d3.csv.parseRows(page, function (d) {
                    return d.some(function (x) {
                        return x.trim().length > 0;
                    }) ? d : false;
                });
            }).filter(function (page) {
                return page.length > 0;
            }));
        }).fail(function (error) {
            throw new Error("error getting file " + fname);
        });
    };

    //getdata(config.basename,1);
    getsingledata(config.filenames[0]);

    $("#parseeq").click(function (event) {
        var eq = $("#equation").val();
        var query;
        try  {
            var queue = EqParser.EqParser.parse(eq);
            log("Parsed RPN: " + queue.map(function (x) {
                return x.val;
            }).join(" "));
            query = makeQuery(queue);
            urlParameters["q"] = eq;
            setParameters();
        } catch (e) {
            visualizeOutput(null, e);
            throw e;
            return;
        }
        try  {
            visualizeOutput(query, query.doQuery(cont));
        } catch (e) {
            visualizeOutput(null, e);
            throw e;
        }
    });
});
//# sourceMappingURL=kitstats.js.map
