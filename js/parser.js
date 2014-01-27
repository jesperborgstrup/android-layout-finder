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
	$("#setting_mv_parentviewparam").hide();
	$("#setting_mv_parentview").hide();
	$("#setting_mv_clicklisteners").hide();
	$("#setting_vh_classname").hide();
	$("#setting_vh_visibility").hide();
	$("#setting_aa_classname").hide();
	$("#setting_aa_arraytype").hide();
	$("#setting_ca_classname").hide();
	$("#setting_ca_constructors").hide();
	$("#setting_rg_linebreak").hide();
	$("#setting_layoutres").hide();
	
	if ( $("#radio_codetype_mv").is(":checked") ) {
		// Member variables
		$("#setting_mv_parentviewparam").show();
		$("#setting_mv_parentview").show();
		$("#setting_mv_clicklisteners").show();
	} else if ( $("#radio_codetype_vh").is(":checked") ) {
		// ViewHolder pattern
		$("#setting_vh_classname").show();
		$("#setting_vh_visibility").show();
	} else if ( $("#radio_codetype_aa").is(":checked") ) {
		// ArrayAdapter with ViewHolder
		$("#setting_aa_classname").show();
		$("#setting_aa_arraytype").show();
		$("#setting_layoutres").show();
	} else if ( $("#radio_codetype_ca").is(":checked") ) {
		// CursorAdapter with ViewHolder
		$("#setting_ca_classname").show();
		$("#setting_layoutres").show();
		$("#setting_ca_constructors").show();
	} else if ( $("#radio_codetype_rg").is(":checked") ) {
		$("#setting_rg_linebreak").show();
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
		rootElement["is_root"] = true;
	}
	catch (err) {
		$('#tree_alert').html('<div class="alert alert-error"><span>Error parsing XML '+ err + '</span></div>');
		$('#code_alert').html('<div class="alert alert-error"><span>Error parsing XML</span></div>');
		$('#tree').html('');
		$('#output').hide();
		return;
	}

	// Clear any error
	$('#tree_alert').html('');
	$('#code_alert').html('');
	$('#tree').removeAttr('disabled');
	$('#output').show();
	
	if ( typeof( rootElement["var_id"] ) == "undefined" ) {
		rootElement["show_id"] = "rootView";
		rootElement["var_id"] = "rootView";
	}

	var tree = prepareForTree( rootElement );
	rootElement["select"] = false;
	
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

function getSelectedTreeNodes( root ) {
	var result = [];
	if ( root.isSelected && root.isSelected() ) {
		result.push( root.data );
	}
	var children = root.getChildren ? root.getChildren() : null;
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
 	var idString = xml_el.attr("android:id");
 	var var_id = getVarId( idString );
	var show_id = getShowId( idString );
	var java_id = getJavaId( idString );
 	return { "className": className,
 			 "type": type,
 			 "var_id": var_id,
 			 "show_id": show_id,
			 "java_id": java_id,
 			 "children": children };
}

function prepareForTree( el ) {
	var children = el['children'];
	for ( var i = 0; i < children.length; i++ ) {
		children[i] = prepareForTree( children[i] );
	}
	
 	var hasId = typeof el['show_id'] != "undefined";
 	
 	var icon = images.indexOf( el['className'] ) > -1 ? el['className'] : "customView";
 	if ( el['className'] == "fragment" ) {
 		icon = "fragment";
 	}
 	if ( hasId ) {
 		el[ "title" ] = el['show_id'] + " <i>" + el['className'] + "</i>";
 	} else {
 		el[ "title" ] = "<span style='color: #A0A0A0'>(No id) <i>" + el['className'] + "</i></span>";
 		
 	}
	el[ "icon" ] = "view-icons/" + icon + ".png";
	el[ "unselectable" ] = !hasId;
	el[ "select" ] = hasId;

	return el;
}

function getVarId( idString ) {
	if ( typeof idString == 'undefined' ) {
		return undefined;
	}
	
	if ( idString.charAt( 0 ) == "@" ) {
		return idString.substring( idString.indexOf( "/", 0 ) + 1, idString.length );
	}
	return idString;
}

function getShowId( idString ) {
	if ( typeof idString == 'undefined' ) {
		return undefined;
	}
	
	if ( idString.charAt( 0 ) == "@" ) {
		var result = idString.substring( idString.indexOf( "/", 0 ) + 1, idString.length );
		if ( idString.substring( 1, 11 ) == "android:id" ) {
			result = "android:" + result;
		}
		return result;
	}
	return idString;
}

function getJavaId( idString ) {
	if ( typeof idString == 'undefined' ) {
		return 0;
	}
	
	if ( idString.charAt( 0 ) == "@" ) {
		var result = "R.id." + idString.substring( idString.indexOf( "/", 0 ) + 1, idString.length );
		if ( idString.substring( 1, 11 ) == "android:id" ) {
			result = "android." + result;
		}
		return result;
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
	$("#xml_input").val('');
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
	$("#help_removeidprefix").css('cursor','pointer').click(function() {
		alert("If you prefix your ID's in your XML-file, and don't want that prefix to be part of the variable name, enter the prefix.")
	});
	$("#help_mv_parentview").css('cursor','pointer').click(function() {
		alert("Enter a Java variable name here to redirect all findViewById() method calls to that variable.");
	});
	$("#chk_support, #chk_includepackage, #chk_dontcamelcase, #chk_rg_linebreak, #chk_mv_parentviewparam, #chk_mv_clicklisteners").change(function() {
		generateJavaFromTree();
	});
	$("#edt_removeidprefix, #edt_varprefix, #edt_mv_parentview, #edt_vh_classname, #edt_aa_classname, #edt_aa_arraytype, #edt_ca_classname, #edt_layoutres").bind("keyup paste", function(e){
		generateJavaFromTree();
	});
	$("#radio_codetype_mv, #radio_codetype_vh, #radio_codetype_aa, #radio_codetype_ca, #radio_codetype_rg").change(function() {
		showOptions();
		generateJavaFromTree();
	});
	$("#radio_vh_visibility_private, #radio_vh_visibility_default, #radio_vh_visibility_protected, #radio_vh_visibility_public").change(function() {
		generateJavaFromTree();
	});
	$("#radio_ca_constructors_simple, #radio_ca_constructors_default, #radio_ca_constructors_all").change(function() {
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

