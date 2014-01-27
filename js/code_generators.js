function generateJavaFromTree() {
	var root = $("#tree").dynatree("getRoot");
	var selected = getSelectedTreeNodes( root );
	for ( var i = 0; i < selected.length; i++ ) {
		selected[i] = prepareForOutput( selected[i] );
	}
	
	if ( selected.length == 0 ) {
		$('#code_alert').html('<div class="alert alert-info"><span>Select at least one view in the tree above to generate code for</span></div>');
		$("#output").hide('');
		return;
	}

	$('#code_alert').html('');
	$("#output").show();
	
	// root is the (invisible) tree system root, and our rootNode is the only
	// child of that system root
	var rootNode = root.getChildren()[0].data;
	var result = "";

	if ( $("#radio_codetype_mv").is(":checked") ) {
		// Member variables
		result = generateJavaFromTreeMv(selected);
	} else if ( $("#radio_codetype_vh").is(":checked") ) {
		// ViewHolder pattern
		result = generateJavaFromTreeVh(selected, rootNode);
	} else if ( $("#radio_codetype_aa").is(":checked") ) {
		// ArrayAdapter with ViewHolder
		result = generateJavaFromTreeAa(selected, rootNode);
	} else if ( $("#radio_codetype_ca").is(":checked") ) {
		// CursorAdapter with ViewHolder
		result = generateJavaFromTreeCa(selected, rootNode);
	} else if ( $("#radio_codetype_rg").is(":checked") ) {
		// RoboGuice
		result = generateJavaFromTreeRg(selected);
	}
	
	result += "\n";
	
	$("#output").text( result );
}

function generateJavaFromTreeMv(selected) {
	var result = "";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\tprivate " + node.className + " " + node.varName + ";\n";
	}

	var parentviewparam = $("#chk_mv_parentviewparam").is(":checked");
	var parentview = $("#edt_mv_parentview").val();
	var clicklisteners = $("#chk_mv_clicklisteners").is(":checked");
	var buttons = [];
	var func_params = "";
	if ( parentviewparam ) {
		parentview = parentview == "" ? "rootView" : parentview;
		func_params = "View " + parentview;
	}
	var parentview_dot = parentview == "" ? "" : parentview+".";
	result += "\n";
	result += getJavadocComment( 1, "Find the Views in the layout" ) + "\n";
	result += "\tprivate void findViews("+func_params+") {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\t\t" + node.varName + " = (" + node.className + ")" + getFindViewCode( parentview_dot, node ) + ";\n";
		// http://stackoverflow.com/a/2548133
		if ( node.className.indexOf( "Button", node.className.length-6 ) !== -1 ) {
			buttons.push( node );
		}
	}
	
	if ( clicklisteners && buttons.length > 0 ) {
		result += "\n";
		for ( var i = 0; i < buttons.length; i++ ) {
			var btn = buttons[i];
			result += "\t\t" + btn.varName + ".setOnClickListener( this );\n";
		}
	}
	
	result += "\t}\n";
	
	if ( clicklisteners && buttons.length > 0 ) {
		result += "\n";
		result += getJavadocComment( 1, "Handle button click events" ) + "\n";
		result += "\t@Override\n";
		result += "\tpublic void onClick(View v) {\n";
		for ( var i = 0; i < buttons.length; i++ ) {
			var btn = buttons[i];
			if ( i == 0 ) {
				result += "\t\t";
			} else {
				result += " else ";
			}
			result += "if ( v == " + btn.varName + " ) {\n";
			result += "\t\t\t// Handle clicks for " + btn.varName + "\n";
			result += "\t\t}";
		}
		result += "\n\t}\n";
	}
	


	return result;
}

function generateJavaFromTreeVh(selected, root, forceRoot) {
	// Only use custom class name if ViewHolder code type is selected
	var className = "ViewHolder";
	if ( $("#radio_codetype_vh").is(":checked") ) {
		var typedClassName = $("#edt_vh_classname").val();
		if ( typedClassName != "" ) {
			className = typedClassName;
		}
	}
	
	var visibility = "";
	if ( $( "#radio_vh_visibility_private" ).is(":checked") ) {
		visibility = "private ";
	} else if ( $( "#radio_vh_visibility_protected" ).is(":checked") ) {
		visibility = "protected ";
	} else if ( $( "#radio_vh_visibility_public" ).is(":checked") ) {
		visibility = "public ";
	}
	
	console.log( "HERE" );
	console.log( root );
	console.log( selected );
	
	var result = getJavadocComment( 0, className + " class for layout."  ) + "\n";
	result += visibility + "static class "+className+" {\n";

	if ( forceRoot ) {
		var rootSelected = false;
		for ( var i = 0; i < selected.length; i++ ) {
			if ( selected[i].key == root.key ) {
				rootSelected = true;
				break;
			}
		}
		if ( !rootSelected ) {
			// http://stackoverflow.com/a/586189
			selected.splice( 0, 0, root );
			if ( typeof( root.varName ) == "undefined" && typeof( root.var_id ) != "undefined" ) {
				root.varName = root.var_id;
			}
			console.log( "VARNAME" );
			console.log( root.varName );
		}
	}
	
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\tpublic final " + node.className + " " + node.varName + ";\n";
	}
	result += "\n";
	result += "\t" + visibility + className+"(";
//	if ( !rootSelected ) {
//		result += root.className + " rootView, ";
//	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += node.className + " " + node.varName;
		if ( i < selected.length - 1 ) {
			result += ", ";
		}
	}
	result += ") {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\t\tthis." + node.varName + " = " + node.varName + ";\n";
	}
	
	result += "\t}\n\n";
	
	var parentview_dot = root.var_id == "" ? "" : root.var_id+".";
	result += "\tpublic static "+className+" create("+root.className+" "+root.var_id+") {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		if ( node["is_root"] ) {
			continue;
		}
		result += "\t\t" + node.className + " " + node.varName + " = (" + node.className + ")" + getFindViewCode( parentview_dot, node ) + ";\n";
	}		
	
	result += "\t\treturn new "+className+"( ";
//	if ( !rootSelected ) {
//		result += parentview + ", ";
//	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += node.varName;
		if ( i < selected.length - 1 ) {
			result += ", ";
		}
	}
	result += " );\n";
	
	result += "\t}\n";
	
	result += "}\n";
	
	return result;
} 

function generateJavaFromTreeAa(selected, root) {
	var className = $("#edt_aa_classname").val();
	className = className == "" ? "MyArrayAdapter" : className;
	var arrayType = $("#edt_aa_arraytype").val();
	arrayType = arrayType == "" ? "Object" : arrayType;
	var layoutRes = $("#edt_layoutres").val();
	layoutRes = layoutRes == "" ? "listitem" : layoutRes;
	
	var rootSelected = selected.indexOf( root ) > -1;
	
	var result = "public class "+className+" extends ArrayAdapter<"+arrayType+"> {\n\n";
	result += tabEachLine( generateJavaFromTreeVh(selected,root,true) ) + "\n";

	result += "\t@Override\n";
	result += "\tpublic View getView(int position, View convertView, ViewGroup parent) {\n";
	result += "\t\tfinal ViewHolder vh;\n";
	result += "\t\tif ( convertView == null ) {\n";
	result += "\t\t\tView view = mInflater.inflate( R.layout."+layoutRes+", parent, false );\n";
	result += "\t\t\tvh = ViewHolder.create( ("+root.className+")view );\n";
	result += "\t\t\tview.setTag( vh );\n";
	result += "\t\t} else {\n";
	result += "\t\t\tvh = (ViewHolder)convertView.getTag();\n";
	result += "\t\t}\n";
	result += "\n";
	result += "\t\t"+arrayType+" item = getItem( position );\n";
	result += "\n";
	result += "\t\t// TODOBind your data to the views here\n";
	result += "\n";
	if ( rootSelected ) {
		result += "\t\treturn vh."+root.var_id+";\n";
	} else {
		result += "\t\treturn vh.rootView;\n";
	}
	result += "\t}\n";
	
	result += "\n";
	result += "\tprivate LayoutInflater mInflater;\n";
	result += "\n";
	result += "\t// Constructors\n";
	result += "\tpublic "+className+"(Context context, List<"+arrayType+"> objects) {\n";
	result += "\t\tsuper(context, 0, objects);\n";
	result += "\t\tthis.mInflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, "+arrayType+"[] objects) {\n";
	result += "\t\tsuper(context, 0, objects);\n";
	result += "\t\tthis.mInflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	
	result += "}\n";
	
	return result;
} 

function generateJavaFromTreeCa(selected, root) {
	var className = $("#edt_ca_classname").val();
	className = className == "" ? "MyCursorAdapter" : className;
	
	var layoutRes = $("#edt_layoutres").val();
	layoutRes = layoutRes == "" ? "listitem" : layoutRes;
	
	var result = "public class "+className+" extends CursorAdapter {\n\n";
	result += tabEachLine( generateJavaFromTreeVh(selected,root) ) + "\n";

	result += "\t@Override\n";
	result += "\tpublic void bindView(View view, Context context, Cursor cursor) {\n";
	result += "\t\tfinal ViewHolder vh = (ViewHolder)view.getTag();\n";
	result += "\n";
	result += "\t\t// TODO Bind your data to the views here\n";
	result += "\t}";
	result += "\n";
	
	result += "\t@Override\n";
	result += "\tpublic View newView(Context context, Cursor cursor, ViewGroup parent) {\n";
	result += "\t\tView view = mInflater.inflate( R.layout."+layoutRes+", parent, false );\n";
	result += "\t\tview.setTag( ViewHolder.create( ("+root.className+")view ) );\n";
	result += "\t\treturn view;\n";
	result += "\t}";
	result += "\n";
	
	result += "\n";
	result += "\tprivate LayoutInflater mInflater;\n";
	result += "\n";
	result += "\t// Constructors\n";
	
	var constructors_simple = $("#radio_ca_constructors_simple").is(":checked");
	var constructors_default = $("#radio_ca_constructors_default").is(":checked");
	var constructors_all = $("#radio_ca_constructors_all").is(":checked");
	
	if ( constructors_simple || constructors_all ) {
		result += "\tpublic "+className+"(Context context) {\n";
		result += "\t\tsuper(context, null, true);\n";
		result += "\t\tthis.mInflater = LayoutInflater.from( context );\n";
		result += "\t}\n";
		result += "\tpublic "+className+"(Context context, Cursor c) {\n";
		result += "\t\tsuper(context, c, true);\n";
		result += "\t\tthis.mInflater = LayoutInflater.from( context );\n";
		result += "\t}\n";
	}
	if ( constructors_default || constructors_all ) {
		result += "\tpublic "+className+"(Context context, Cursor c, boolean autoRequery) {\n";
		result += "\t\tsuper(context, c, autoRequery);\n";
		result += "\t\tthis.mInflater = LayoutInflater.from( context );\n";
		result += "\t}\n";
		result += "\tpublic "+className+"(Context context, Cursor c, int flags) {\n";
		result += "\t\tsuper(context, c, flags);\n";
		result += "\t\tthis.mInflater = LayoutInflater.from( context );\n";
		result += "\t}\n";
	}
	
	result += "}\n";
	
	return result;
} 

function generateJavaFromTreeRg(selected) {
	var linebreak = $("#chk_rg_linebreak").is(":checked");
	var longestVar = 0;
	var result = "";
	$.each( selected, function(i,node) {
		longestVar = Math.max( longestVar, node.var_id.length );
	});
	
	$.each( selected, function(i,node) {
		result += "\t@InjectView(" + node.java_id + ") ";
		if ( linebreak ) {
			result += "\n\tprivate " + node.className + " " + node.varName + ";\n";
		} else {
			var padlength = longestVar - node.var_id.length;
			for ( var i = 0; i < padlength; i++ ) {
				result += " ";
			}
			result += "private " + node.className + " " + node.varName + ";\n";
		}
	});
	
	return result;
}

function tabEachLine( input ) {
	return "\t" + input.replace( /\n/g, "\n\t" );
}

function getFindViewCode( parentview_dot, node ) {
	if ( node.type == "view" ) {
		return parentview_dot + "findViewById( "+node.java_id+" )";
	} else if ( node.type == "fragment") {
		var fragmentMan = $("#chk_support").is(":checked") ? "getSupportFragmentManager()" : "getFragmentManager()";
		return fragmentMan + ".findFragmentById( "+node.java_id+" )";
	}
}

function getClassName( node ) {
 	if ( ! $("#chk_includepackage").is(':checked') && node.className.indexOf( '.' ) > -1 ) {
 		return node.className.substring( node.className.lastIndexOf( '.' ) + 1, node.className.length );
 	} else {
 		return node.className;
 	}
}

function getJavadocComment( tabs, text ) {
	var result = "/**\n";
	if ( text != "" ) {
		result += " * " + text + "<br />\n";
		result += " * <br />\n";
	}
	var date = new Date();
	result += " * Auto-created on " + date.getFullYear() + "-" + zeropad( date.getMonth()+1, 2 ) + "-" + zeropad( date.getDate(), 2 ) + " " + zeropad( date.getHours(), 2 ) + ":" + zeropad( date.getMinutes(), 2 ) + ":" + zeropad( date.getSeconds(), 2 );
	result += " by Android Layout Finder\n";
	result += " * (http://www.buzzingandroid.com/tools/android-layout-finder)\n";
	result += " */";
	
		
	for ( var i = 0; i < tabs; i++ ) {
		result = tabEachLine( result );
	}
	
	return result;
}

function zeropad(number, length) {
	   
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
   
    return str;

}

function getVariableName( node ) {
	var camelcase = !$("#chk_dontcamelcase").is(":checked");
	var removeidprefix = $("#edt_removeidprefix").val();
	var prefix = $("#edt_varprefix").val(); 
	var varName = node.var_id;

	if ( removeidprefix != "" && varName.indexOf( removeidprefix ) == 0 ) {
		varName = varName.substring( removeidprefix.length, varName.length )
	}
	
	if ( camelcase ) {
		varNameParts = varName.split( "_" );
		varName = varNameParts[0];
		$.each( varNameParts.slice( 1 ), function(key,part){
			varName += capitalize( part );
		});
	}
	
 	if ( prefix != "" ) {
 		// If the prefix ends with an underscore, don't capitalize
 		if ( prefix.charAt( prefix.length-1 ) == '_' ) {
 			return prefix + varName;
 		} else {
 			return prefix + capitalize( varName );
 		}
 	} else {
 		return varName;
 	}
}

function capitalize(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function prepareForOutput( node ) {
	var newNode = jQuery.extend( true, {}, node );
	newNode.className = getClassName( newNode );
	newNode.varName = getVariableName( newNode );
	
	return newNode;
}

