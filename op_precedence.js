(function(){
	Object.prototype.error= function(msg){
	  throw new Error(msg);
	}
	// A simple token object contains these members:
	//      type: 'name', 'string', 'number', 'operator'
	//      value: string or number value of the token
	//      from: index of first character of the token
	//      to: index of the last character + 1
	String.prototype.tokens=function(prefix,suffix){
		var c; //the current charactor
		var from; // the index of the start of the token
		var i =0; //the index of current character
		var length = this.length;
		var n;   //the numbe value
		var q;   //the quote character
		var str; //the string value
		var result = []; 
	
		var make = function(type,value){
			return {type:type,value:value,form:from,to:i};
		}
		//if string is empty
		if(!this) {return;}
		if (typeof prefix !== 'string') {
		    prefix = '<>+-&';
		}
		if (typeof suffix !== 'string') {
		    suffix = '=>&:';
		}

		c = this.charAt(i);
		while(c){
			from = i;
			if(c <= ' '){
				i += 1;
				c=this.charAt(i);		
			}else if((c >= 'a' && c<= 'z') || (c >= 'A' && c<= 'Z')){
				str = c;
				i +=1;
				for(;;){
					c = this.charAt(i);
					if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
		                    (c >= '0' && c <= '9') || c === '_') {
		                str += c;
		                i += 1;
		            } else {
		                break;
		            }
				}
				result.push(make("name",str));
			}else if(c >= '0' && c <= '9'){
				str = c;
				i += 1;
				for(;;){
					c = this.charAt(i);
					if(c < '0' || c > '9'){break;}
					i += 1;
					str += c;
				}
				if(c === '.'){
					i += 1;
					str += c;
					for(;;){
						c = this.charAt(i);
						if(c < '0' || c > '9'){break;}
						i += 1;
						str += c;
					}
				}
				if(c === 'e' || c ==='E'){
					i += 1;
					str += c;
					c = this.charAt(i);
					if(c === '-' || c === '+'){
						i += 1;
						str += c;
						c = this.charAt(i);
					}
					if(c < '0' || c > '9'){make('number',str).error("bad exponent");}
					do{
						i += 1;
						str += c;
						c = this.charAt(i);
					}while(c >= '0' && c <= '9');
				}
				if(c >='a' && c <= 'z'){
					str += c;
					i += 1;
					make('number',str).error("bad number");
				}	

				n =  +str;
				if(isFinite(n)){
					result.push(make('number',n));			
				}else{
					make('number',str).error("bad number");
				}
			}else if(c === '\'' || c === '"'){
				str = '';
				q = c;
				i += 1;
				for(;;){
					c = this.charAt(i);
					if(c < ' '){
						make('string',str).error(c == '\n' || c == '\r' || c == ''? "unterminated string" : "control character in string",make('',str));
					}
					if (c === q){break;}
					if(c === '\\'){
						i += 1;
						if(i >= length){make('string',str).error("unterminate string");}
						c = this.charAt(i);
						switch (c){
						case 'b':
							c = '\b';break;
						case 'f':
							c = '\f';break;
						case 'n':
							c = '\n';break;
						case 'r':
							c = '\r';break;
						case 't':
							c = '\t';break;
						case 'u':
							if(i >= length){make('string',str),error("unterminated string");}
							c = parseInt(this.substr(i+1,4),16);
							if(!isFinite(c) || c < 0){make('string', str).error("Unterminated string");};
							c = String.fromCharCode(c);
							i += 4;
							break;
						}
					}
					str += c;
					i += 1;
				}
				i += 1;
				result.push(make('string',str));
				c = this.charAt(i);
			}else if(c == '/' && this.charAt(i+1) == '/'){
				i += 1;
				for(;;){
					c =this.charAt(i);
					if(c === '\n' || c === '\r' || c === '') {break;}
					i += 1;
				}
		
			}else if(prefix.indexOf(c) >= 0){
				str = c;
				i += 1;
				while(true){
					c = this.charAt(i);
					if(i >= length || suffix.indexOf(c) < 0){break;}
					str += c;
					i += 1;
				}
				result.push(make('operator',str));
			}else{
				i += 1;
				result.push(make('operator',c));
				c = this.charAt(i);
			}
		}
	
		return result;
	};

	//parse
	var make_parse = function () {
		var symbol_table ={};

		var original_symbol = {
			nud: function(){	
				this.error("undefined.");
			},
			led: function(left){
				this.error("undefined.");
			}
		};

		var symbol = function(id,bp){
			var s = symbol_table[id];
			bp = bp || 0;
			if(s){
				//??
				if(bp >= s.lbp){
					s.lbp = bp;
				}
			}else{
				s = Object.create(original_symbol);
				s.id = s.value = id;
				s.lbp = bp;
				s.scope = scope;
				symbol_table[id] = s;
			}
			return s;
		};

		symbol(":");
		symbol(";");
		symbol(",");
		symbol(")");
		symbol("]");
		symbol("}");
		symbol("else");
		//(end) symbol indicate end of the token stream
		symbol("(end)");
		//The (name) symbol is the prototype for new names, such as variable names.
		symbol("(name)");

		var token,token_nr,tokens;

		var advance = function(id){
			var a, o, t, v;
			if (id && token.id !== id){
				token.error("expected " + id);
			}
			if (token_nr >= tokens.length){
				token = symbol_table["(end)"];
				return;	
			}
			t = tokens[token_nr];
			token_nr += 1;
			v = t.value;
			a = t.type;
			if(a === "name"){
				o = scope.find(v);
			}else if( a === "operator"){
				o = symbol_table[v];
				if(!o){
					t.error("unknown operator " + v);
				}
			}else if(a === "string" || a === "number"){
				a = "literal";
				o = symbol_table["(literal)"];
			}else {
				t.error("unexpected token");
			}

			token = Object.create(o);
			token.value = v;
			token.arity = a;
			return token;
		};

		var scope;
		var itself = function(){return this};

		var original_scope = {

			define: function(n){
				var t = this.def[n.value];
				if (typeof t === "object"){
					n.error(t.reserved ? "reserved":"defined");
				}
				this.def[n.value] = n;
				n.reserved = false;
				n.nud      = itself;
				n.led      = null;
				n.std      = null;
				n.lbp  	   = null;
				n.scope	   = scope;
				return n;
			},
			find: function (n){
				var e =this, o;
				while(true){
					o = e.def[n];
					if(o && typeof o !== 'function'){
						return e.def[n];
					}
					e = e.parent;
					if(!e){
						o = symbol_table[n];
						return o && typeof o !== 'function'? o : symbol_table["(name)"];
					}
				}
			},
			pop: function(){
				scope = this.parent;
			},
			reserve: function(n){
				if(n.arity !== "name" || n.reserved) return;
				var t = this.def[n.value];
				if(t){
					if(t.reserved) return;
					if(t.arity === "name"){
						n.error("reserved");
					}
				}
				this.def[n.value] = n;
				n.reserved = true;
			},
			putEnv:function(env){
				this.stack.push(env);
			},
			getEnv:function(){
				return this.stack[this.stack.length-1];
			},
			popEnv:function(){
				this.stack.pop();
			}
		};

		var new_scope = function(){
			var s = scope;
			scope = Object.create(original_scope);
			scope.def = {};
			scope.stack = [];
			scope.parent = s;
			return scope;
		}

		var expression = function(rbp){
			var left;
			var t = token;
			advance();
			left = t.nud();
			while(rbp < token.lbp){
				t = token;
				advance();
				left = t.led(left);
			}
			return left;
		}

		var infix = function(id, bp, led){
			var s = symbol(id, bp);
			s.led = led || function(left){
				this.first = left;
				left._parent = this;
				var expr = expression(bp);
				this.second = expr;
				expr._parent = this;
				this.arity = "binary";
				return this;
			};
			return s;
		}

		infix("+", 50);
		infix("-", 50);
		infix("*", 60);
		infix("/", 60);

		infix("===", 40);
		infix("!==", 40);
		infix("<", 40);
		//infix("<=", 40);
		infix(">", 40);
		//infix(">=", 40);

		infix("?", 20, function(){
			this.first = left;
			left._parent = this;
			var sec = expression(0);
			this.second = sec;
			sec._parent = this;
			advance(":");
			var thi = expression(0);
			this.third = thi;
			thi._parent = this;
			this.arity = "ternary";
			return this;
		});
		//The . operator is used to select a member of an object. The token on the right must be a name, but it will be used as a literal.
		infix(".", 80, function(left){
			this.first = left;
			left._parent = this;
			if(token.arity !== "name"){
				token.error("expect a name");
			}
			token.arity = "literal";
			this.second = token;
			token._parent = this;
			this.arity = "binary";
			advance();
			return this;
		});

		infix("[", 80, function(left){
			this.first = left;
			left._parent = this;
			var expr = expression(0);
			this.second = expr;
			expr._parent = this;
			this.arity = "binary";
			advance("]");
			return this;
		});
		// infix operator of right associative 
		var infixr = function(id, bp, led){
			var s = symbol(id, bp);
			s.led = led || function(left){
				this.first = left;
				left._parent = this;
				var expr = expression(bp - 1);
				this.second = expr;
				expr._parent = this;
				this.arity = "binary";
				return this;
			};
			return s;
		};

		infixr("&&", 30);
		infixr("||", 30);

		var prefix = function(id, nud){
			var s = symbol(id);
			s.nud = nud || function(){
				scope.reserve(this);
				var expr = expression(70);
				this.first = expr;
				expr._parent = this;
				this.arity = "unary";
				return this;
			}
			return s;
		};
		prefix("-");
		prefix("!");
		prefix("typeof");

		prefix("(",function(){
			var e = expression(0);
			advance(")");
			return e;
		});

		var assignment = function(id){
		  return infixr(id, 10, function(left){
			if(left.id !== "." && left.id !== "[" && left.arity !== "name"){
				left.error("bad lvalue");
			}
			this.first = left;
			left._parent = this;
			var expr = expression(9);
			this.second = expr;
			expr._parent = this;
			this.assignment = true;
			this.arity = "binary";
			return this;
		  });
		};
		assignment("=");
		//assignment("+=");
		//assignment("-=");

		var constant = function(s, v){
			var x = symbol(s);
			x.nud = function(){
				scope.reserve(this);
				this.value = symbol_table[this.id].value;
				this.arity = "literal";
				return this;	
			}
			x.value = v;
			return x;
		};

		constant("true", true);
		constant("false", false);
		constant("null", null);
		constant("pi", 3.141592653589793);

		symbol("(literal)").nud = itself;


	
		var statement = function(){
		  var n = token, v;
		  if(n.std) {
			advance();
			scope.reserve(n);
			return n.std();
		  }
		  v = expression(0);
		  //if(!v.assignment && v.id !== "("){
			//v.error("bad expression");
		  //}
		  advance(";");
		  return v;
		};

		var statements = function(){
		  var a = [], s;
		  while(true){
			if(token.id === "}" || token.id === "(end)") break;
			s = statement();
			if(s){
			  a.push(s);
			  s._parent = a;	
			}
		  }
		  a.scope = scope;
		  return a;
		};

		var stmt = function(s,f){
		  var x = symbol(s);
		  x.std = f;
		  return x;
		};

		stmt("{", function(){
		  //new_scope();
		  var a = statements();
		  advance("}");
		  //scope.pop();
		  return a;
		});

		var block = function(){
		  var t= token;
		  advance("{");
		  return t.std();
		};

		stmt("var", function(){
			var a =[], n, t;
			while(true){
				n = token;
				if(n.arity !== "name"){
					n.error("expect a variable");
				}
				scope.define(n);
				advance();
				if(token.id === "="){
					t = token;
					advance('=');
					t.first = n;
					n._parent = t;
					var expr = expression(0);
					t.second = expr;
					expr._parent = t;
					t.arity = "binary";
					a.push(t);
				}
				if(token.id !== ","){
					break;
				}
				advance(",");
			}
			advance(";");
			return a.length == 0 ? null : a.length == 1 ? a[0] : a; 
		});

		stmt("while", function(){
			advance("(");
			var expr = expression(0);
			this.first = expr;
			expr._parent = this;
			advance(")");
			var bk = block();
			this.second = bk;
			bk && (bk._parent = this);
			this.arity = "statement";
			return this;
		});

		stmt("if", function(){
			advance("(");
			var expr = expression(0);
			this.first = expr;
			expr._parent = this;
			advance(")");
			var bk = block();
			this.second = block;
			bk && (bk._parent = this);
			if(token.id === "else"){
				scope.reserve(token);
				advance("else");
				var third = token.id === "if" ? statement(): block()
				this.third = third;
				third._parent = this;	
			}else{
				this.third = null;
			}
			this.arity = "statement";
			return this;
		});

		stmt("break", function(){
			advance(";");	
			if(token.id !== "}"){
				token.error("unreachable statement");
			}
			this.arity = "statement";
			return this;
		});

		stmt("return", function(){
			if(token.id !== ";"){
				var expr = expression(0);
				this.first = expr;
				expr._parent = this;
			}
			advance(";");
			if(token.id !== "}"){ token.error("unreachable statement");}
			this.arity = "statement";
			return this;
		});

		prefix("function", function(){
			var a = [];
			new_scope();
			this.scope = scope;
			if(token.arity === "name"){
				scope.define(token);
				this.name = token.value;
				advance();
			}
			advance("(");
			if(token.id !== ")"){
				while(true){
					if(token.arity !== "name"){ token.error("expected a parameter name");}
					scope.define(token);
					a.push(token);
					advance();
					if(token.id !== ","){
						break;			
					}
					advance(",");
				}
			}
			this.first = a;
			a._parent = this;
			advance(")");
			advance("{");
			var stats = statements()
			this.second = stats;
			stats._parent = this;
			advance("}");
			this.arity = "function";
			scope.pop();
			return this;
		});

		infix("(",80, function(left){
			var a = [];
			if(left.id === "." || left.id === "["){
				this.arity = "ternary";
				this.first = left.first;
				left.first._parent = this;
				this.second = left.second;
				left.second._parent = this;
				this.third = a;
				a._parent = this;
			}else{
				this.arity = "binary";
				this.first = left;
				left._parent = this;
				this.second = a;
				a._parent = this;
				if((left.arity !== "unary" || left.id !== "function")&&
						left.arity !== "name" && left.id != "(" && left.id !== "&&" && left.id !== "||" && left.id !== "?" ){
					left.error("expect a variable name");
				}
			}
			if(token.id !== ")"){
				while(true){
					a.push(expression(0));
					if(token.id !== ","){break;}
					advance(",");
				}
			}	
			advance(")");
			return this;
		});

		symbol("this").nud = function(){
			scope.reserve(this);
			this.arity = "this";
			return this;
		};

		prefix("[",function(){
			var a = [];
			if(token.id !== "]"){
				while(true){
					a.push(expression(0));
					if(token.id !== ","){
						break;
					}
					advance(",");
				}
			}
			advance("]");
			this.first = a;
			a._parent = this;
			this.arity = "unary";
			return this;
		});

		prefix("{", function(){
			var a = [];
			if(token.id !== "}"){
				while(true){
					var n = token;
					if(n.arity !== "name" && n.arity !== "literal"){
						token.error("bad key.");
					}
					advance();
					advance(":");
					var v = expression(0);
					v.key = n.value;
					a.push(v);
					if(token.id !== ","){break;}
					advance(",");
				}
			}
			advance("}");
			this.first = a;
			a._parent = this;
			this.arity = "unary";
			return this;
		});
	
		return function(source){
			tokens = source.tokens('=<>!+-*&|/%^', '=<>&|');
			token_nr = 0;
			new_scope();
			advance();
			var s = statements();
			advance("(end)");
			scope.pop();
			return s;
		};
	};


	var parse =  make_parse();
	
	var original_env = {
		find:function(name){
			var vals = this.values;
			if(vals.hasOwnProperty(name)){
				return vals[name];
			}else{
				var parent = this.parent;
				if(parent){
					return parent.find(name);
				}
				return undefined;
			}
		}
	};

	var interpreter = function(root){

		var rootEnv = Object.create(original_env);
		rootEnv.values = {};
		rootEnv.loopIndex = [];
		rootEnv.scope = root.scope;
		rootEnv.scope.putEnv(rootEnv);
		for(var i =0;i < root.length;i++){
			interpret(root[i],rootEnv);
		}
		
		rootEnv.scope.popEnv();
		
		return rootEnv;
	}

	var interpret = function(node,env){
		if(env.hasOwnProperty('_return')) return;		

		//node type
		if(node.arity === 'binary'){
			if(node.value === '='){
				var left = node.first,right = node.second;
				var symbol = left.scope.find(left.value);
				interpret(right,env);
				symbol.scope.getEnv().values[left.value] = right._result;
			}else{
				var left = node.first,right = node.second;
				switch (node.value) {
					case "+":
						interpret(left,env);
						interpret(right,env);
						node._result = left._result + right._result;
						break;
					case "-":
						interpret(left,env);
						interpret(right,env);
						node._result = left._result - right._result;
						break;
					case "*":
						interpret(left,env);
						interpret(right,env);
						node._result = left._result * right._result;
						break;
					case "/":
						interpret(left,env);
						interpret(right,env);
						node._result = left._result / right._result;
						break;
					case "&&":
						interpret(left,env);
						if(left._result){
							interpret(right,env);
							node._result = !!right._result;
						}else{
							node._result = false;
						}
						break;
					case "||":
						interpret(left,env);
						if(left._result){
							node._result = true;
						}else{
							interpret(right,env);
							node._result = !!right._result;
						}
						break;
					case "===":
						interpret(left,env);
						interpret(right,env);
						node._result = (left._result === right._result);
						break;
					case "!==":
						interpret(left,env);
						interpret(right,env);
						node._result = (left._result !== right._result);
						break;
					case ">":
						interpret(left,env);
						interpret(right,env);
						node._result = (left._result > right._result);
						break;
					case "<":
						interpret(left,env);
						interpret(right,env);
						node._result = (left._result < right._result);
						break;
					case ".":
						//TODO
						break;
					case "[":
						//TODO
						break;
					case "(":
						//function invoke
						var funcName = node.first,vals = node.second;
					
						var func = env.find(funcName.value);
						var newEnv = Object.create(original_env);
						newEnv.parent = func._env;
						newEnv.values = {};
						loopIndex = [];
						newEnv.scope = func.scope;
						newEnv.scope.putEnv(newEnv);
						
						var params = func.first,stats = func.second;
						//param and vals'count equal
						for(var i=0;i<params.length;i++){
							var paramNode = params[i],valNode = vals[i];
							interpret(valNode,env);
							newEnv.values[paramNode.value] = valNode._result;
						}
						
						for(var j=0;j<stats.length;j++){
							if(newEnv.hasOwnProperty('_return')) break;
							interpret(stats[j],newEnv);
						}
						
						node._result = newEnv._return;
						//pop stack
						newEnv.scope.popEnv();						

						break;
					default:
						node.error("unknown type");
						break;
				}
			}
		
		}else if(node.arity === 'name'){
			node._result =env.find(node.value);
		}else if(node.arity === 'ternary'){
			//TODO
		}else if(node.arity === 'unary'){
			var left = node.first;
			interpret(left,env);
			switch (node.value){
				case '-':
					node._result = left._result * -1;
					break;
				case '!':
					node._result = !left._result;
					break;
				case 'typeof':
					node._result = typeof left._result;
					break;
				//TODO '{'
				default:
					node.error("unknown type");
					break;
			}
		}else if(node.arity === 'literal'){
			node._result = node.value;
		}else if(node.arity === 'statement'){
			if(env.hasOwnProperty('_return')) return;

			if(node.value == 'return'){
				if(node.first){
					interpret(node.first,env);
					env._return = node.first._result;	
				}else{
					env._return = undefined;
				}
				
			}else if(node.value == 'if'){
				var condition = node.first;
				interpret(condition,env);
				if(condition._result){
					if(node.second){
						var rs = interpret(node.second,env);
						if(rs) return rs;
					} 
				}else{
					if(node.third){
					var rs = interpret(node.third,env);
					if(rs) return rs;
					} 
				}
			}else if(node.value == 'while'){
				
				var condition = node.first;
				interpret(condition,env);
				while(condition._result){
					if(node.second){
						var rs = interpret(node.second,env);
						if(rs && rs == 'break') break; 
						if(env.hasOwnProperty('_return')) break;
						interpret(condition,env);
					}
					 
				}
				
			}else if(node.value == 'break'){
				
				var upNode = node._parent;
				while(upNode){
					if(upNode.arity === 'statement' && (upNode.value == 'while') ){
						break;
					}
					
					upNode = upNode._parent;
					if(!upNode || (upNode.arity == 'function')) node.error("break statement not in any loops");
				}
				
				return 'break';
				
			}else{
				node.error("unknown type");
			}
		}else if(node.arity === 'function'){
			node._env = env;
			node._result = node;
		}else if(node.arity === 'this'){
			//TODO
		}else if(Array.isArray(node)){
			for(var i =0;i < node.length;i++){
				var rs = interpret(node[i],env);
				if(rs) return rs;
			}
		}else{
			node.error("unknown type");
		}
	}

	var source = " var rz,a = -2,b = 1; \
				   var test = function (a){ while(a < 0){ a = a+1; break;} a = a + 1;return a;}; \
				   rz = test(a) + b +3 * 5; \
	";


	console.log(parse(source));
	console.log(interpreter(parse(source)));

})();




























