	
var prefixMgr;
	
  $(document).ready(function(){
  
	prefixMgr = new PrefixManager();
	
	var workspace = new Workspace({prefixMgr : prefixMgr});
	
	//alert("loaded");
	var proxyurl = "proxy.php";
	var remUrl = "http://sdlxapp00.metmuseum.org:10035/repositories/Don/size";
	$.ajax({
		url : proxyurl,
		data : {
			url: remUrl,
		},	
		success : function(retdata){
			console.log(retdata);			
		}
	});
	

	
  });
  
  
  
var Workspace = Backbone.Model.extend({

	defaults : { 
		divclass : "workspace",
		facets : null,
		results : null,
		prefixMgr: null,
	},
	
	
	initialize : function(){
		this.set("facets",  new Facets());
		_.extend(this.get("facets"), Backbone.Events);
		this.set("results", new Results({workspace: this}));
		var container = this;
		this.get("facets").bind("add", function(item){
			_.extend(item, Backbone.Events);
			item.on("facetUpdated", function(facet){
			//	container.facetUpdated(this, facet);
			});
			item.on("facetAdded", function(args){
			//	container.facetAdded(args.facet, args.property, args.readable, args.varname);
			});
			console.log("add happened 1" );
		});
		

		console.log("before add facet");
		this.get("results").addColumn("type", "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>");
		this.get("facets").add({property : "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>", name : "type"});
				console.log("after add facet");

		this.get("facets").at(0).set("resultsLink",this.get("results"));
		//this.populateFacets();

	},



	


});


var SelectedFacetValue = Backbone.Model.extend({
	value : "",
	text : "",

});

var SelectedFacetValues = Backbone.Collection.extend({
	model : SelectedFacetValue

});


var Facet = Backbone.Model.extend({
	defaults : {
		property : "",
		name : "",
		selectedValues : null,
		queryObj : null,
		addFacetQueryObj : null,
		facetsList : null,
		facetTable : null, 
		nextFacet : null,
		resultsLink : null
	},
	
	initialize : function(){
	//	this.populate();
		var facetVarName = "facetvar" + this.cid;
		this.set("selectedValues", new SelectedFacetValues());
		this.set("facetTable", $(".facets_table .body").append("<td id='facetcell"+facetVarName+"'><table id='"+facetVarName+"'><tr><th>"+this.get("name")+" ----- <span class='facetGo' id='facetGo"+facetVarName+"'>Update</span></th></tr>"+
							"<tr><td><select size=20 name='select"+facetVarName+"' id='select"+facetVarName+"' MULTIPLE></select></td></tr></table></td><td id='addfacetcell"+facetVarName+"' valign='top'></td>"));
		this.setQueryObj(new SPARQLQuery({prefixMgr : prefixMgr}));
		this.populate();
	},
	
	facetUpdated : function(){
		this.setQueryObj(new SPARQLQuery({prefixMgr : prefixMgr}));
		this.populate();
	},
	
	populate : function () {
		var facetVarName = "facetvar" + this.cid;
		console.log("varname " + facetVarName);
		
		var container = this;

		//$(".facets_table th").append("<td>"+this.get("name")+"</td>");
		$("#select"+facetVarName).empty();
		$("#select"+facetVarName).append("<option value=''>WAITING...</option>");
		
		this.get("queryObj").doQuery(function(retdata){
			console.log("back fromquery");
			console.log(retdata);
			retdata = $.parseJSON(retdata);
			//$(".main").html("query: " + query );
			//$(".results_table .header").append("<td>class</td>");
			$("#select"+facetVarName).empty();
			$.each(retdata.values, function(index, value){
				value = prefixMgr.extractURI(value[0]);
				var parsed =  prefixMgr.extractPrefix(value);
				var selected = "";
				if(container.get("selectedValues").where({value : value}).length > 0){
					selected = "SELECTED";
				}
				var option = $("#select"+facetVarName).append("<option value='"+value+"' " + selected + " >"+parsed.prefix+":"+parsed.word+"</option>");
			});						
		});	
		$("#facetGo"+facetVarName).click(function(){
			container.get("selectedValues").reset();
			$("#select"+facetVarName + " option:selected").each(function () {
				console.log($(this).val());
				container.get("selectedValues").add({value: $(this).val(), text: $(this).text()}, {silent: true});
			});
			container.facetUpdated();
//			container.trigger("facetUpdated", container);
//			container.change();
		});
		
		if(this.get("selectedValues") != null && this.get("selectedValues").size() > 0){
			this.populateAddFacetSection();
			if(this.get("nextFacet") != null){
				this.get("nextFacet").populate();			
			}else if(this.get("resultsLink") != null){
				this.get("resultsLink").populate();
			}
		}
		
	},


	populateAddFacetSection : function (){
		var facetVarName = "facetvar" + this.cid;
		var container = this;
		console.log("populating add facet section");
		$("#addfacetcell"+facetVarName).html("<select><option value=''>WAITING...</option></select>");
		this.get("addFacetQueryObj").doQuery(function(retdata){
			retdata = $.parseJSON(retdata);
			console.log("add properties");
			console.log(retdata);
			$("#addfacetcell"+facetVarName).empty();
			var select = $("<select><option value=''>Add Facet</option></select>").appendTo("#addfacetcell"+facetVarName);
			$.each(retdata.values, function(index, value){
				value = prefixMgr.extractURI(value[0]);
				var parsed =  prefixMgr.extractPrefix(value);
				var option = $(select).append("<option value='"+value+"'  >"+parsed.prefix+":"+parsed.word+"</option>");
			});		
			$(select).change(function(){
				var property = $("option:selected", this).val();
				var readable = $("option:selected", this).text();
				var varname = readable.split(":")[1];
				console.log("p " + property + " r " + readable + " varname " + varname);
				var newFacet = new Facet({property : "<"+property+">", name : varname});
				if(container.get("nextFacet") != null){
					newFacet.set("nextFacet", container.get("nextFacet"));
					container.unset("nextFacet");
				}
				container.set("nextFacet", newFacet);
			});
		});
	},

	
	

	setQueryObj : function(queryObj){
		var facetVarName = "facetvar" + this.cid;
		console.log("setting query obj " + queryObj.cid +", adding facet  " + facetVarName);
		
		var uniqValuesQuery = queryObj.clone();
		queryObj.cloneVars(uniqValuesQuery);			
		this.setGetUniqueFacetValuesQuery(uniqValuesQuery);
		
		var newQuery = queryObj.clone();
		queryObj.cloneVars(newQuery);			
		this.alterQueryObj(newQuery);

		var addFacetQuery = newQuery.clone();
		newQuery.cloneVars(addFacetQuery);		
		this.setAddFacetQuery(addFacetQuery);
		
		if(this.get("nextFacet") != null){
			this.get("nextFacet").setQueryObj(newQuery);			
		}else if(this.get("resultsLink") != null){
			this.get("resultsLink").setQueryObj(newQuery);
		}
			
	},
	
	setGetUniqueFacetValuesQuery : function(queryObj){
		var facetVarName = "facetvar" + this.cid;
		queryObj.resetSelects();
		queryObj.addSelect(facetVarName);
		queryObj.addTriple("?resource " + this.get("property") + " ?"+facetVarName);		
		queryObj.set("distinct", true);
		this.set("queryObj", queryObj);
	},
	
	setAddFacetQuery : function (queryObj){
		// find all possible facets that could be added after this facet.
		// that is, every DISTINCT  property attached to any resource that's matches the resource search up to this point, discounting future facet selections
		queryObj.set("distinct", true);
		// ?prop where {?r ?prop ?anyvalue }
		queryObj.resetSelects();
		queryObj.addSelect("prop");
		queryObj.addTriple("?r ?prop ?anyvalue");
		this.set("addFacetQueryObj", queryObj);
	
	},	
	

	
	alterQueryObj : function (queryObjShared){
		var where = this.generateSPARQLWhere();
		if(where.trim() != ""){
			console.log("altering queryObj, " + queryObjShared.cid + " adding where " + where);
			queryObjShared.addTriple(where);
		}
		
	},
	

	
	generateSPARQLWhere : function(){
		var sparqlarray = [];
		var container = this;
		$.each(this.get("selectedValues"), function(key, item){
			sparqlarray.push(" { ?r " + container.get("property") + "  <" + container.get("selectedValues").models[key].get("value") + ">  } ");
		});
		var querysegment = "";
		if(sparqlarray.length  > 0){
			querysegment = "{ " + sparqlarray.join(" UNION ") + " } " ; 
		}
		console.log("returning querysegment " + querysegment);
		return querysegment;
	}
	

});

var Facets = Backbone.Collection.extend({

	model: Facet,
//	divclass : "facets",
	defaults : {
		workspace: null,
	},
	
	initialize : function(){
		var container = this;
		this.bind("add", function(item){
			item.set("facetsList", container);
			console.log("added faceet item " + item.get("property"));
		});
	},	
	
	generateSPARQL : function () {
		var sparray = [];
		var container = this;
		$.each(this.models, function(item){
			//console.log("facet " + container.models[item].generateSPARQL());
			sparray.push(container.models[item].generateSPARQL());
		});
		return sparray.join(" . " );
	
	},
		
});





var Results = Backbone.Model.extend({
	divclass : "results",
	defaults : {
		workspace: null,
		columns : [], // array, in order, of object {text : "header" , property "propertyname"}
		limit: 20,
		offset: 0,
		queryObj: null,
		addColumnQueryObj: null,
	},
	
	setQueryObj : function(queryObj){
		console.log("setting query obj");
		this.set("queryObj", queryObj);
		this.get("queryObj").set("distinct",false);
		this.get("queryObj").set("limit",this.get("limit"));
		this.get("queryObj").set("distinct",this.get("offset"));
		this.get("queryObj").set("selects", []);
		this.get("queryObj").addTriple(this.generateSPARQLWhere());
		this.get("queryObj").addSelect(this.generateSPARQLSelect());
		
		var addColumnQuery = queryObj.clone();
		queryObj.cloneVars(addColumnQuery);
		this.setAddColumnQuery(addColumnQuery);
	},
		
	
	addColumn : function(text, property){
		console.log("pushing " + text + " : " + property);
		this.get("columns").push({text: text, property : property});
		
	},
	
	generateSPARQLSelect : function (){
		var sparray = ["r"];
		var container = this;	
		console.log("generating select");
		console.log(this.get("columns"));
		$.each(this.get("columns"), function(key, value){
			sparray.push(value.text);
			console.log(value.text + " : "  + value.property);
		});
		return sparray;
	
	},
	
	generateSPARQLWhere : function (){
		var sparray = [];
		var container = this;
		$.each(this.get("columns"), function(key, value){
			sparray.push("?r " + value.property + " ?"+value.text );
			console.log(value.text + " : "  + value.property);
		});
		var where = sparray.join(" . ");
		console.log("in results, generating Where "+ where);
		return where;
	
	},

	
	populate : function (){
		console.log("populating results  ");
		var container = this;
		$(".results_waiting").append("WAITING...");
		this.get("queryObj").doQuery(function(retdata){
			$(".results_waiting").empty();
			retdata = $.parseJSON(retdata);
			console.log("got data");
			console.log(retdata);
			console.log(retdata.names);
			$(".results_table").html("<tr class='header'></tr>");
			$.each(retdata.names, function(key, value){
				$(".results_table .header").append("<th>" + value + "</th>");
			});
			$.each(retdata.values, function(key, value){
				//$('<div class="selectors"></div>').appendTo(container);
				var newrow = $("<tr></tr>").appendTo(".results_table");
				$.each(value, function(key, value2){
					value2 = prefixMgr.extractURI(value2);
					var parsed =  prefixMgr.extractPrefix(value2);
					$(newrow).append("<td>"+parsed.prefix+":"+parsed.word+"</td>");
				});

			});	
			container.populateAddColumnSection();			
		});
		
		
	},

	populateAddColumnSection : function (){
		var container = this;
		$("#addColumn").empty();
		$(".results_table .header").append("<th><select id='addColumn'></select></th>");	
		$("#addColumn").append("<option value=''>WAITING...</option>");
		console.log("populating add facet section");
		this.get("addColumnQueryObj").doQuery(function(retdata){
			retdata = $.parseJSON(retdata);
			console.log("add properties");
			console.log(retdata);
			$("#addColumn").empty();
			$("#addColumn").append("<option value=''>Add Column...</option>");
			$.each(retdata.values, function(index, value){
				value = prefixMgr.extractURI(value[0]);
				var parsed =  prefixMgr.extractPrefix(value);
				$("#addColumn").append("<option value='"+value+"'  >"+parsed.prefix+":"+parsed.word+"</option>");
			});						
		});
		$("#addColumn").change(function(){
			console.log($(this));
			var property = $("option:selected", this).val();
			var readable = $("option:selected", this).text();
			var varname = readable.split(":")[1];
			
			console.log("value selected"  + varname+ " : " +property);
			container.addColumn(varname, "<"+property+">" );
			
			container.setQueryObj(container.get("queryObj"));
			
			/*
			container.get("queryObj").addSelect(container.generateSPARQLSelect());
			var addColumnQuery = container.get("queryObj").clone();
			container.get("queryObj").cloneVars(addColumnQuery);
			container.setAddColumnQuery(addColumnQuery);			
			*/
			container.populate();
		});
	},
	
	setAddColumnQuery : function (queryObj){
		// find all possible facets that could be added after this facet.
		// that is, every DISTINCT  property attached to any resource that's matches the resource search up to this point, discounting future facet selections
		queryObj.set("distinct", true);
		// ?prop where {?r ?prop ?anyvalue }
		queryObj.set("selects",[]);
		queryObj.addSelect("prop");
		queryObj.addTriple("?r ?prop ?anyvalue");
		this.set("addColumnQueryObj", queryObj);
	
	},		
	
	initialize : function(){
		console.log("init results");
		this.set("query", new SPARQLQuery());
	},
	
}); 






var SPARQLQuery = Backbone.Model.extend({

	defaults : {
		proxyurl : "proxy.php",
		endpoint : "http://sdlxapp00.metmuseum.org:10035/repositories/Don",
		accept : "application/json",
		//accept : "application/sparql-results+xml",
		queryString : "",
		/* egs:
		"select distinct ?class {?resource a ?class}";
		*/
		
		distinct : false,
		selects : [],
		
		whereTriples : [], // an array of arrays, outer array is joined with ANDs (.), inner with OR ( UNION ), then AND, and so on, recurively (but I'm just implementing two layers for starters
		prefixMgr : null,
		limit : -1,
		offset : -1,
		
	},
	
	
	initialize : function(){
		this.set("whereTriples", []);
		this.set("selects", []);

		
	},
	
	
	// cloning specific vars onto an object of the same type
	cloneVars : function(newObj){
		newObj.set("whereTriples", this.get("whereTriples").slice(0));
		newObj.set("selects", this.get("selects").slice(0));
	
	},
	
	resetSelects : function(){
		this.set("selects", []);
	},
	resetWhereTriples : function(){
		this.set("whereTriples", []);
	},
	
	addSelect : function(value){
		console.log("adding select");
		console.log(value);
		var sel = this.get("selects");
		console.log(sel);
		if($.isArray(value) && value.length > 0){
			sel.push.apply(sel, value);
		}else{			
			sel.push(value);
		}
	},
	
	addTriple : function (tripleString, index){
		console.log("adding "+ tripleString + " to whereTriples in  "+ this.cid);
		console.log(this.get("whereTriples"));
		if(index){
			this.get("whereTriples")[index] = tripleString;
			return index;
		}else{
			if($.isArray(tripleString) && tripleString.length > 0){
				console.log("appendng ");
				console.log(tripleString);
				this.get("whereTriples").push.apply(this.get("whereTriples"), tripleString);
			}else{
				this.get("whereTriples").push(tripleString);
			}
			return this.get("whereTriples").length - 1;
		}
		
	},
	
	constructQuery : function(){
		console.log("constructing query");
		console.log(this.get("selects"));
		var query = " select ";
		if(this.get("distinct")){
			query += " DISTINCT ";
		}
		query += "?"+ this.get("selects").join(" ?");
		query += " WHERE  "  + this.constructWhere();
		
		if(this.get("limit") >= 0){
			query += " LIMIT " + this.get("limit");
		}
		if(this.get("offset") >= 0){
			query += " OFFSET " + this.get("offset");
		}
		
		this.set("queryString", query);
		return query;
	},
	
	
	constructWhere : function(){
		var whereArray = [];
		
		console.log("in constructWhere");
		console.log(this.get("whereTriples"));
		$.each(this.get("whereTriples"), function(key, value){
			// might be array, or string.
			// 
			if($.isArray(value) && value.length > 0){
				// if array, group together with UNION, and add to whereArray
				var union = [];
				$.each(this.get("whereTriples"), function(key2, value2){
					console.log("adding " + value2 + " to union array");
					union.push(value2);
				});
				if(union.length > 0){
					whereArray.push("{ " + union.join (" UNION " ) + "} ")
				}
			}else{
				// aotherwise, 
				console.log("adding " + value + " to wherearray");
				whereArray.push(value);
			}
			
		});
	
		var wherestring = "{ " + whereArray.join( " . " ) + " } " ;
		return wherestring;
	},
	
	doQuery : function (callback){ 	
		this.constructQuery();
		console.log("in doQuery doing query " + this.get("queryString"));
		$.ajax({
			url : this.get("proxyurl"),
			data : {
				url: this.get("endpoint"),
				data: {
					query : this.get("queryString"),				
				},
				accept: this.get("accept"),
			},	
			success : function(retdata){
				console.log("got data back");
				callback(retdata);
			
			},
			failure : function (message){
				console.log("failed" );
			},
		});
	},
	
});





  
var PrefixManager = Backbone.Model.extend({
	prefixes : [],
	prefixes_rev : [],

	extractPrefix : function(uri){
	
		if(this.isScalar(uri)){
			return this.extractScalarPrefix(uri);
		}
		var smaller = uri.replace("http://",'');
		var split = smaller.split("/");	
		if(split[split.length - 1].indexOf("#") != -1){
			split = smaller.split("#");
		}
		var word  = split.pop();
		var pre = split.join("/");

		var prefix = "";
		if(this.prefixes[pre]){
			prefix = this.prefixes[pre];
		}else{
			prefix = this.buildPrefix(pre);
			this.prefixes[pre] = prefix;
			this.prefixes_rev[prefix] = pre;
		}
		return {"full":uri,
				"prefix":prefix,
				"word":word,
				"scalar" : false,
				};
	},
	
	
	isScalar : function(value){
		if(value.indexOf("^^") != -1){
			return true;
		}
		return false;
	},

	extractScalarPrefix : function(uri){
		var split = uri.split("^^");
		var value = split[0];
		var typeuri = split[1];
		var parsed = this.extractPrefix(typeuri);
		if(parsed.word == "integer"){
			prefix = "int";
		}else{
			console.log ("unknown type" + typeuri);
		}
		word = value;
		return {
				"full":uri,
				"prefix":prefix,
				"word":word,
				"scalar" : true,
		}
	},
	
	buildPrefix : function(pre){
		var short = "";
		var found = false;
		var container = this;
		while(!found && pre != ""){
			$.each(pre, function(key, value){
		//			console.log("v " + value);
				if(/[a-zA-Z]/.test(value)){
					if(!container.prefixes_rev[short+ value]){
						short= short+value;
						found = true;
						return false;
					}
				}
			});
			if(!found){
				short += pre.substr(0,1);
				pre = pre.substr(1);
			}
		}
		return short;
	},


	extractURI : function(uri){
		var newstring = uri.replace('<','').replace('>', '');
		return newstring;
	},
});
  