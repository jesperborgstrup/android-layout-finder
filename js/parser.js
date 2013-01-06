/*
 * Copyright 2013 Jesper Borgstrup
 *
 * This file is part of Android Layout Finder.
 * 
 * Android Layout Finder is free software: you can redistribute it and/or modify it under 
 * the terms of the GNU General Public License as published by the Free Software Foundation, 
 * either version 3 of the License, or (at your option) any later version.
 * 
 * Android Layout Finder is distributed in the hope that it will be useful, 
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY 
 * or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * 
 * See http://www.gnu.org/licenses/ for the full license text
 */

var images = ["AbsoluteLayout","AdapterViewFlipper","AnalogClock","AutoCompleteTextView","Button","CalendarView","CheckBox","CheckedTextView","Chronometer","DatePicker","DialerFilter","DigitalClock","EditText","ExpandableListView","FrameLayout","Gallery","GestureOverlayView","GridLayout","GridView","HorizontalScrollView","ImageButton","ImageSwitcher","ImageView","LinearLayout","MediaController","MultiAutoCompleteTextView","NumberPicker","ProgressBar","QuickContactBadge","RadioButton","RadioGroup","RatingBar","RelativeLayout","ScrollView","SearchView","SeekBar","SlidingDrawer","Space","Spinner","StackView","SurfaceView","Switch","TabHost","TableLayout","TableRow","TabWidget","TextSwitcher","TextureView","TextView","TimePicker","ToggleButton","TwoLineListItem","VerticalLinearLayout","ViewAnimator","ViewFlipper","ViewStub","ViewSwitcher","WebView","ZoomButton","ZoomControls"];

function sampleData() {
	$("#xml_input").val( "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<RelativeLayout xmlns:android=\"http://schemas.android.com/apk/res/android\"\n    xmlns:tools=\"http://schemas.android.com/tools\"\n    android:layout_width=\"match_parent\"\n    android:layout_height=\"match_parent\"\n    android:background=\"@color/black\"\n    tools:ignore=\"Overdraw\" >\n\n    <VideoView\n        android:id=\"@+id/videoView\"\n        android:layout_width=\"match_parent\"\n        android:layout_height=\"match_parent\"\n        android:layout_centerInParent=\"true\" />\n\n    <ProgressBar\n        android:id=\"@+id/videoProgressBar\"\n        style=\"@android:style/Widget.ProgressBar.Large\"\n        android:layout_width=\"100dp\"\n        android:layout_height=\"100dp\"\n        android:layout_centerInParent=\"true\" />\n\n<\/RelativeLayout>" );
	generateTreeFromInput();
	generateJavaFromTree();
}

function showOptions() {
	$("#setting_mv_parentview").hide();
	$("#setting_aa_classname").hide();
	$("#setting_aa_arraytype").hide();
	$("#setting_ca_classname").hide();
	$("#setting_layoutres").hide();
	
	if ( $("#radio_codetype_mv").is(":checked") ) {
		// Member variables
		$("#setting_mv_parentview").show();
	} else if ( $("#radio_codetype_vh").is(":checked") ) {
		// ViewHolder pattern
	} else if ( $("#radio_codetype_aa").is(":checked") ) {
		// ArrayAdapter with ViewHolder
		$("#setting_aa_classname").show();
		$("#setting_aa_arraytype").show();
		$("#setting_layoutres").show();
	} else if ( $("#radio_codetype_ca").is(":checked") ) {
		// CursorAdapter with ViewHolder
		$("#setting_ca_classname").show();
		$("#setting_layoutres").show();
	}
}

function generateTreeFromInput() {
	var rootElement;
	try {
		xmlDoc = $.parseXML( $("#xml_input").val() );
		root = $( $( xmlDoc ).find( ":first" ).get() );
		if ( root.children().length == 0 ) {
			$('#tree_alert').html('<div class="alert alert-info"><span>Paste in your XML layout file</span></div>');
			$('#code_alert').html('<div class="alert alert-info"><span>Paste in your XML layout file</span></div>');
			$('#tree').html('');
			
			$('#output').hide();
			return;
		}
		rootElement = recursiveParseXmlElement( root, 0 );
	}
	catch (err) {
		$('#tree_alert').html('<div class="alert alert-error"><span>'+err.message+'</span></div>');
		$('#code_alert').html('<div class="alert alert-error"><span>'+err.message+'</span></div>');
		$('#tree').html('');
		$('#output').hide();
		return;
	}

	// Clear any error
	$('#tree_alert').html('');
	$('#code_alert').html('');
	$('#tree').removeAttr('disabled');
	$('#output').show();

	var tree = prepareForTree( rootElement );
	
	$("#tree").dynatree({
		minExpandLevel: 1000,
		persist: true,
		checkbox: true,
		selectMode: 2,
		children: tree,
		imagePath: "img/tree/",
		onSelect: function(node) {
			generateJavaFromTree();
		},
 		onActivate: function(node) {
 			node.select( !node.isSelected() );
		}
	});
	$("#tree").dynatree("getTree").reload();
	$("#tree").dynatree("getRoot").visit(function(node){
		node.expand(true);
	});
	generateJavaFromTree();
}

function generateJavaFromTree() {
	var root = $("#tree").dynatree("getRoot");
	var selected = getSelectedTreeNodes( root );
	
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
	}
	
	$("#output").text( result );
}

function generateJavaFromTreeMv(selected) {
	var result = "";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\tprivate " + node.className + " " + node.id + ";\n";
	}
	
	var parentview = $("#edt_mv_parentview").val();
	var parentview_dot = parentview == "" ? "" : parentview+".";
	result += "\n";
	result += "\tprivate void initializeViews() {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += "\t\t" + node.id + " = (" + node.className + ")" + getFindViewCode( parentview_dot, node ) + ";\n";
	}
	
	result += "\t}";

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
		result += "\tpublic final " + node.className + " " + node.id + ";\n";
	}
	result += "\n";
	result += "\tprivate ViewHolder(";
	if ( !rootSelected ) {
		result += root.className + " rootView, ";
	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += node.className + " " + node.id;
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
		result += "\t\tthis." + node.id + " = " + node.id + ";\n";
	}
	
	result += "\t}\n";
	
	var parentview;
	if ( rootSelected ) {
		parentview = root.id;
	} else {
		parentview = $("#edt_mv_parentview").val() != "" ? $("#edt_mv_parentview").val() : "rootView";
	}
	var parentview_dot = parentview == "" ? "" : parentview+".";
	result += "\n";
	result += "\tpublic static ViewHolder create("+root.className+" "+parentview+") {\n";
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		if ( node == root ) {
			continue;
		}
		result += "\t\t" + node.className + " " + node.id + " = (" + node.className + ")" + getFindViewCode( parentview_dot, node ) + ";\n";
	}		
	
	result += "\t\treturn new ViewHolder( ";
	if ( !rootSelected ) {
		result += parentview + ", ";
	}
	for ( var i = 0; i < selected.length; i++ ) {
		var node = selected[i];
		result += node.id;
		if ( i < selected.length - 1 ) {
			result += ", ";
		}
	}
	result += " );\n";
	
	result += "\t}\n";
	
	result += "}";
	
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
	result += "\n";

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
	result += "\tpublic "+className+"(Context context, int resource, int textViewResourceId, List<"+arrayType+"> objects) {\n";
	result += "\t\tsuper(context, resource, textViewResourceId, objects);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, int resource, int textViewResourceId, "+arrayType+"[] objects) {\n";
	result += "\t\tsuper(context, resource, textViewResourceId, objects);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, int resource, int textViewResourceId) {\n";
	result += "\t\tsuper(context, resource, textViewResourceId);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, int textViewResourceId, List<"+arrayType+"> objects) {\n";
	result += "\t\tsuper(context, textViewResourceId, objects);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, int textViewResourceId, "+arrayType+"[] objects) {\n";
	result += "\t\tsuper(context, textViewResourceId, objects);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	result += "\tpublic "+className+"(Context context, int textViewResourceId) {\n";
	result += "\t\tsuper(context, textViewResourceId);\n";
	result += "\t\tthis.inflater = LayoutInflater.from( context );\n";
	result += "\t}\n";
	
	result += "}";
	
	return result;
} 

function generateJavaFromTreeCa(selected, root) {
	var className = $("#edt_ca_classname").val();
	className = className == "" ? "MyCursorAdapter" : className;
	
	var layoutRes = $("#edt_layoutres").val();
	layoutRes = layoutRes == "" ? "listitem" : layoutRes;
	
	var result = "public class "+className+" extends CursorAdapter {\n\n";
	result += tabEachLine( generateJavaFromTreeVh(selected,root) ) + "\n";
	result += "\n";

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
	
	result += "}";
	
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
		result += fragmentMan + ".findFragmentById( R.id."+node.id+" )";
	}
}

function getSelectedTreeNodes( root ) {
	var result = [];
	if ( root.isSelected() ) {
		result.push( root.data );
	}
	var children = root.getChildren();
	if ( children != null ) for ( var i = 0; i < children.length; i++ ) {
		result = result.concat( getSelectedTreeNodes( children[i] ) );
	}
	return result;
}

function Element(name, id, children) {
	this.name = name;
	this.id = id;
	this.children = children;
}

Element.prototype.toString = function() {
	var result = "<" + this.name + " id='"+this.id+"'>";
	for ( var i = 0; i < this.children.length; i++ ) {
		result += this.children[i];
	}
	result += "</" + this.name + ">";
	return result;
};

function recursiveParseXmlElement( xml_el ) {
	var children = [];
 	for ( var i = 0; i < xml_el.children().length; i++ ) {
 		child = xml_el.children().eq(i);
 		if ( child.prop( "tagName" ) == "requestFocus" ){
 			continue;
 		}
		children.push( recursiveParseXmlElement( child ) );
	}
 	var tagName = xml_el.prop( "tagName" );
 	var type = "view";
 	var className = tagName;
 	if ( className == "fragment" ) {
 		className = xml_el.attr( "android:name" );
 		type = "fragment";
 	}
 	var id = stripIdPrefix( xml_el.attr("android:id") );
 	return { "className": className,
 			 "type": type,
 			 "id": id,
 			 "children": children };
}

function prepareForTree( el ) {
	var children = el['children'];
	for ( var i = 0; i < children.length; i++ ) {
		children[i] = prepareForTree( children[i] );
	}
	
 	var hasId = typeof el['id'] != "undefined";
 	
 	var icon = images.indexOf( el['className'] ) > -1 ? el['className'] : "customView";
 	if ( el['className'] == "fragment" ) {
 		icon = "fragment";
 	}
 	if ( hasId ) {
 		el[ "title" ] = el['id'] + " <i>" + el['className'] + "</i>";
 	} else {
 		el[ "title" ] = "<span style='color: #A0A0A0'>(No id) <i>" + el['className'] + "</i></span>";
 		
 	}
	el[ "icon" ] = "view-icons/" + icon + ".png";
	el[ "unselectable" ] = !hasId;
	el[ "select" ] = hasId;

	
	return el;
}

function stripIdPrefix( idString ) {
	if ( typeof idString == 'undefined' ) {
		return undefined;
	}
	
	if ( idString.charAt( 0 ) == "@" ) {
		return idString.substring( idString.indexOf( "/", 0 ) + 1, idString.length );
	}
	return idString;
}

function SelectText(element) {
    var doc = document
        , text = doc.getElementById(element)
        , range, selection
    ;    
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();        
        range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

$(document).ready(function() {
	//	sampleData();
	showOptions();
	generateTreeFromInput();
	$("#button_parse").click(function() {
		generateTreeFromInput();
	});
//	$("#button_copy_java").click(function() {
//		alert("BLAH");
//	})
//	$("#button_copy_java").zclip({
//	    path: "js/ZeroClipboard.swf",
//	    copy: function(){
//	    	alert("copied to clipboard");
//	    	return $("#output").val();
//	    }
//	});
	$("#button_generate").click(function() {
		generateJavaFromTree();
	});
	$("#button_example").click(function() {
		sampleData();
	});
	$("#xml_input").bind("keyup paste", function(e){
		generateTreeFromInput();
	});
	$("#xml_input").focus(function() {
	    var $this = $(this);
	    $this.select();

	    // Work around Chrome's little problem
	    $this.mouseup(function() {
	        // Prevent further mouseup intervention
	        $this.unbind("mouseup");
	        return false;
	    });
	});
	$("#output").click(function() {
		SelectText("output");
	});
	$("#help_support").css('cursor','pointer').click(function() {
		alert("If this is checked, the FragmentManager is retrieved with getSupportFragmentManager() instead of getFragmentManager().");
	});
	$("#help_mv_parentview").css('cursor','pointer').click(function() {
		alert("Enter a Java variable name here to redirect all findViewById() method calls to that variable.");
	});
	$("#chk_support").change(function() {
		generateJavaFromTree();
	});
	$("#edt_mv_parentview, #edt_aa_classname, #edt_aa_arraytype, #edt_ca_classname, #edt_layoutres").bind("keyup paste", function(e){
		generateJavaFromTree();
	});
	$("#radio_codetype_mv, #radio_codetype_vh, #radio_codetype_aa, #radio_codetype_ca").change(function() {
		showOptions();
		generateJavaFromTree();
	});
//	$(document).on('dragenter',function(event){
//		event.preventDefault();
//		$(document).cursor( 'not-allowed' );
//		$("*:visible").fadeTo( 500, 50 );
//		$('#xml_input').fadeTo( 500, 100 );
//	});
//	$(document).on('dragleave',function(event){
//		event.preventDefault();
//		$(document).cursor( 'auto' );
//		$("*:visible").fadeTo( 500, 50 );
//	});
//	$(document).on('dragover',function(event){
//		event.preventDefault();
//	});
//	$('#xml_input').on('dragover', function(event) {
//				
//	});
//	$('#xml_input').on('drop', function(event) {
//
//		 //stop the browser from opening the file
//		 event.preventDefault();
//
//		 //Now we need to get the files that were dropped
//		 //The normal method would be to use event.dataTransfer.files
//		 //but as jquery creates its own event object you ave to access 
//		 //the browser even through originalEvent.  which looks like this
//		 var files = event.originalEvent.dataTransfer.files;
//
//		 //Use FormData to send the files
//		 var formData = new FormData();
//
//		 //append the files to the formData object
//		 //if you are using multiple attribute you would loop through 
//		 //but for this example i will skip that
//		 formData.append('files', files[0]);
//
//		 });
});

