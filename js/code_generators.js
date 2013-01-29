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
	
	var parentview = $("#edt_mv_parentview").val();
	var parentview_dot = parentview == "" ? "" : parentview+".";
	result += "\n";
	result += "\tprivate void findViews() {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\t\t" + node.varName + " = (" + node.className + ")" + getFindViewCode( parentview_dot, node ) + ";\n";
	}
	
	result += "\t}\n";

	return result;
}

function generateJavaFromTreeVh(selected, root) {
	var result = "private static class ViewHolder {\n";
	var rootSelected = selected.indexOf( root ) > -1;
	
	if ( !rootSelected ) {
		result += "\tpublic final "+ root.className +" rootView;\n";
	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\tpublic final " + node.className + " " + node.varName + ";\n";
	}
	result += "\n";
	result += "\tprivate ViewHolder(";
	if ( !rootSelected ) {
		result += root.className + " rootView, ";
	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += node.className + " " + node.varName;
		if ( i < selected.length - 1 ) {
			result += ", ";
		}
	}
	result += ") {\n";
	if ( !rootSelected ) {
		result += "\t\tthis.rootView = rootView;\n";
	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\t\tthis." + node.varName + " = " + node.varName + ";\n";
	}
	
	result += "\t}\n\n";
	
	var parentview;
	if ( rootSelected ) {
		parentview = root.id;
	} else {
		parentview = $("#edt_mv_parentview").val() != "" ? $("#edt_mv_parentview").val() : "rootView";
	}
	var parentview_dot = parentview == "" ? "" : parentview+".";
	result += "\tpublic static ViewHolder create("+root.className+" "+parentview+") {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		if ( node == root ) {
			continue;
		}
		result += "\t\t" + node.className + " " + node.varName + " = (" + node.className + ")" + getFindViewCode( parentview_dot, node ) + ";\n";
	}		
	
	result += "\t\treturn new ViewHolder( ";
	if ( !rootSelected ) {
		result += parentview + ", ";
	}
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
	result += tabEachLine( generateJavaFromTreeVh(selected,root) ) + "\n";

	result += "\t@Override\n";
	result += "\tpublic View getView(int position, View convertView, ViewGroup parent) {\n";
	result += "\t\tfinal ViewHolder vh;\n";
	result += "\t\tif ( convertView == null ) {\n";
	result += "\t\t\tView view = inflater.inflate( R.layout."+layoutRes+", parent, false );\n";
	result += "\t\t\tvh = ViewHolder.create( ("+root.className+")view );\n";
	result += "\t\t\tview.setTag( vh );\n";
	result += "\t\t} else {\n";
	result += "\t\t\tvh = (ViewHolder)convertView.getTag();\n";
	result += "\t\t}\n";
	result += "\n";
	result += "\t\t"+arrayType+" item = getItem( position );\n";
	result += "\n";
	result += "\t\t// Bind your data to the views here\n";
	result += "\n";
	if ( rootSelected ) {
		result += "\t\treturn vh."+root.id+";\n";
	} else {
		result += "\t\treturn vh.rootView;\n";
	}
	result += "\t}\n";
	
	result += "\n";
	result += "\tprivate LayoutInflater inflater;\n";
	result += "\n";
	result += "\t// Constructors\n";
	result += "\tpublic "+className+"(Context context, List<"+arrayType+"> objects) {\n";
	result += "\t\tsuper(context, 0, objects);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, "+arrayType+"[] objects) {\n";
	result += "\t\tsuper(context, 0, objects);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
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
	result += "\t\tViewHolder vh = (ViewHolder)view.getTag();\n";
	result += "\n";
	result += "\t\t// Bind your data to the views here\n";
	result += "\t}";
	result += "\n";
	
	result += "\t@Override\n";
	result += "\tpublic View newView(Context context, Cursor cursor, ViewGroup parent) {\n";
	result += "\t\tView view = inflater.inflate( R.layout."+layoutRes+", parent, false );\n";
	result += "\t\tview.setTag( ViewHolder.create( ("+root.className+")view ) );\n";
	result += "\t\treturn view;\n";
	result += "\t}";
	result += "\n";
	
	result += "\n";
	result += "\tprivate LayoutInflater inflater;\n";
	result += "\n";
	result += "\t// Constructors\n";
	result += "\tpublic "+className+"(Context context, Cursor c, boolean autoRequery) {\n";
	result += "\t\tsuper(context, c, autoRequery);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, Cursor c, int flags) {\n";
	result += "\t\tsuper(context, c, flags);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	
	result += "}\n";
	
	return result;
} 

function generateJavaFromTreeRg(selected) {
	var linebreak = $("#chk_rg_linebreak").is(":checked");
	var longestVar = 0;
	var result = "";
	$.each( selected, function(i,node) {
		longestVar = Math.max( longestVar, node.id.length );
	});
	
	$.each( selected, function(i,node) {
		result += "\t@InjectView(R.id." + node.id + ") ";
		if ( linebreak ) {
			result += "\n\tprivate " + node.className + " " + node.varName + ";\n";
		} else {
			var padlength = longestVar - node.id.length;
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
		return parentview_dot + "findViewById( R.id."+node.id+" )";
	} else if ( node.type == "fragment") {
		var fragmentMan = $("#chk_support").is(":checked") ? "getSupportFragmentManager()" : "getFragmentManager()";
		return fragmentMan + ".findFragmentById( R.id."+node.id+" )";
	}
}

function getClassName( node ) {
 	if ( ! $("#chk_includepackage").is(':checked') && node.className.indexOf( '.' ) > -1 ) {
 		return node.className.substring( node.className.lastIndexOf( '.' ) + 1, node.className.length );
 	} else {
 		return node.className;
 	}
}

function getVariableName( node ) {
	var camelcase = !$("#chk_dontcamelcase").is(":checked");
	var prefix = $("#edt_varprefix").val(); 
	var varName = node.id;
	
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

