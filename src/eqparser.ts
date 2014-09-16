module EqParser {
export enum TokenType {
	INVALID, LBRACKET, LPAREN, LBRACE,
	RBRACKET, RPAREN, RBRACE,
	IDENTIFIER, OPERATOR, NUMBER, COMMA
}
export class Token {
	constructor(public val:string, public begin:number, public end:number, public type:TokenType) {}
	toString() {
		return TokenType[this.type]+": "+this.val;
	}
	is(...arr:TokenType[]) {
		return arr.indexOf(this.type)>=0;
	}
}
class Operator {
	constructor(public precedence, public leftAss) {}
	static operators = {
		// also add new ops in "regexes below"
		'+':new Operator(4,true),
		'-':new Operator(4,true),
		'*':new Operator(5,true),
		'/':new Operator(5,true),
		'&':new Operator(3,true),
		',':new Operator(2,true)
	}
}
export class EqParser {
	inp:string;
	pos:number = 0;
	constructor(inp:string) {
		this.inp = inp;
	}

	hasTokens() { return this.pos<this.inp.length; }

	private readToken() {
		while(" \t\r\n".indexOf(this.inp[this.pos])>=0) this.pos++;
		var subinp = this.inp.substr(this.pos);
		var token:Token;
		var regexes:any[][] = [
			[/^[0-9]+/, TokenType.NUMBER],
			[/^[a-z][a-z0-9_]*(:[a-z0-9_]+)?/i, TokenType.IDENTIFIER],
			[/^[+*/&,-]/, TokenType.OPERATOR],
			[/^\(/, TokenType.LPAREN],
			[/^\[/, TokenType.LBRACKET],
			[/^\{/, TokenType.LBRACE],
			[/^\)/, TokenType.RPAREN],
			[/^\]/, TokenType.RBRACKET],
			[/^\}/, TokenType.RBRACE]
		];
		for(var i=0; i<regexes.length;i++) {
			var match = subinp.match(regexes[i][0]);
			if(match) {
				token = new Token(this.inp.substring(this.pos,this.pos+match[0].length), this.pos, this.pos+match[0].length, regexes[i][1]);
				this.pos += match[0].length;
				break;
			}
		}
		if(!token) {
			token = new Token(this.inp[this.pos], this.pos,++this.pos, TokenType.INVALID);
		}
		return token;
	}

	interpret():Token[] {
		var queue:Token[] = [];
		var stack:Token[] = [];
		function peek() { if(stack.length>0) return stack[stack.length-1];}
		while(this.hasTokens()) {
			var token = this.readToken();
			if(token.is(TokenType.NUMBER,TokenType.IDENTIFIER))
				queue.push(token);
			else if(token.is(TokenType.LPAREN,TokenType.LBRACE,TokenType.LBRACKET))
				stack.push(token);
			else if(token.is(TokenType.COMMA)) {
				while(!peek().is(TokenType.LBRACE)) {
					queue.push(stack.pop());
				}
			}
			else if(token.is(TokenType.OPERATOR)) {
				var op = Operator.operators[token.val];
				while(stack.length>0) {
					var top = peek();
					var op2 = Operator.operators[top.val];
					if(top.is(TokenType.OPERATOR) &&
							((op.leftAss && op.precedence <= op2.precedence) ||
							op.precedence < op2.precedence)) {
						queue.push(stack.pop());
					} else break;
				}
				stack.push(token);
			}
			else if(token.is(TokenType.RPAREN,TokenType.RBRACE,TokenType.RBRACKET)) {
				while(!peek().is(TokenType.LPAREN,TokenType.LBRACE,TokenType.LBRACKET)) queue.push(stack.pop());
				stack.pop();
			}
			else throw new Error("Unknown Token: "+token.toString());
		}
		while(stack.length>0) {
			if(!peek().is(TokenType.OPERATOR)) throw new Error("invalid token remaining: "+peek().toString());
			else queue.push(stack.pop());
		}
		return queue;
	}



	static parse(inp:string) {
		return new EqParser(inp).interpret();
	}
}
}
