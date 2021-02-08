//var source = "https://gamepress.gg/arknights/sites/arknights/files/2020-04/level_act4d0_st07.txt";
var source = "https://gamepress.gg/arknights/sites/arknights/files/2020-04/test_story.txt";
const url_filepath = "https://gamepress.gg/arknights/sites/arknights/files/avg/";
var raw_script = "unchanged";

jQuery.get(source, function(data){raw_script = data.split("\n");
  initialize_script();});
/////////////////////////////////////////////
//individual frame definition
////////////////////////////////////////////
//frame[0] - left
//frame[1] - right
//frame[2] - center
//frame[3] - focus
//frame[4] - text
//frame[5] - image
//frame[6] - bg
//frame[7] - frame_type: Default, Decision, Predicate, Branch End, Decision End
//frame[8] - decision_list -> array length should equal predicate end array length for decision end.
//frame[9] - decision_value
//frame[10] -

////////////////////////
//state variables
///////////////////////
var proto_frame = null; //current frame that will be "recorded"
//var in_decision = false; //state variable for in a decision or not.  Locks Progress if true.
//var decision_end = null; //The decision values (i.e. 1;2;3)
//var decision_type = null;//One Answer or Multiple Answer.
var frame_list = [];//the array that will hold all the frames.
var asset_preload = [];


/////////////////////////////////////////
//Script to Frames//
////////////////////////////////////////

function initialize_script(){
    interpret_script(raw_script);
    initialize_reader();
}

function interpret_script(script){
  var frame_index = 0;
  var dialogue_true = true;
  proto_frame = new Array(10).fill('');
  proto_frame[6] = "https://gamepress.gg/arknights/sites/arknights/files/avg/backgrounds/bg_default.png";
  proto_frame[7] = "default";

  script.forEach(line => choose_case(line));
  //console.log(frame_list);
}

function choose_case(line){
    var record_frame = false;

    switch(parse_tag(line)){

      case 'Character':
        wipe();
        add_assets(line);//protoframe[0-3]
        break;

      case 'name':
        parse_dialogue(true, line);//protoframe[4]
        record_frame = true;
        break;

      case 'Narration':
        parse_dialogue(false, line);//protoframe[4]
        record_frame = true;
        break;

      case 'Dialog':
        proto_frame[4] = "";//Clear the textbox.
        break;

      case 'Image':
        proto_frame[5] = parse_img(line, "image");
        break;

      case 'Background':
        //If there is a ( at the end it's specific, else default background is black.
        proto_frame[6] = parse_img(line, "bg");
        break;

      case 'Decision':
        proto_frame[7] = "Decision";
        set_decision_list(line);//proto_frame[8]
        record_frame = true;
        break;

      case 'Predicate':
        proto_frame[7] = "Predicate";
        set_decision_value(line);//proto_frame[9] It will attach itself to a dialogue, so no need to record.
        break;


      case 'cameraEffect':
        break;

      default:
        //if not one of the keywords, skip to next line.
        break;
    }

    if (record_frame){
      //"record" the current frame.  Like how videos work.
        newframe = new Array(10);
        newframe = Object.assign(newframe, proto_frame);
        frame_list.push(newframe);
        proto_frame[7] = "default";
    }
  }


function parse_tag(line){
  if (line[0] == "["){
    var reg = /\[(.*?)[=(\]]/;//extracts from [ to = or ( or ].
    var raw_tag = reg.exec(line)[1];
    return raw_tag;
  }
  else if ((line.length > 1) && (line[0] != "/")){
    //blank spaces can be skipped.  Couldn't figure out how to discriminate \n and spaces, so if there is a one letter narration this will fail.
    return "Narration";
  }
}

function parse_dialogue(name=false, line){
  if (name){
    var regExp = /"(.*?)"/;//extracts everything in quotation marks.
    var ch_name = regExp.exec(line)[1];
    if (ch_name != ""){
      proto_frame[4] = ch_name + ": " + line.slice(line.indexOf("]")+1);
    }
    else{
      proto_frame[4] = line.slice(line.indexOf("]")+1);
    }
  }
  else {
    proto_frame[4] = line;
  }
}

function add_assets(line){
  //parse for the image name and then add it into frames.
  if (line.includes("name2=")){//Can probably shorten via regex later on but...
		var ch1_start = line.indexOf("name=", 0) + 6;
		var ch1_end = line.indexOf('"', ch1_start); //rightmost quotation
    ch1 = line.slice(ch1_start, ch1_end);
    proto_frame[0] = append_url(ch1, "character");
    check_asset_preload(proto_frame[0]);

    var ch2_start = line.indexOf("name2=", 0) + 7;
    var ch2_end = line.indexOf('"', ch2_start);
    ch2 = line.slice(ch2_start, ch2_end);
    proto_frame[1] =  append_url(ch2, "character");
    check_asset_preload(proto_frame[1]);
  }
	else if (line.includes("name")){
		var ch1_start = line.indexOf("name=", 0) + 6;
		var ch1_end = line.indexOf('"', ch1_start); //rightmost quotation
    ch1 = line.slice(ch1_start, ch1_end);
    proto_frame[2] = append_url(ch1, "character");
    check_asset_preload(proto_frame[2]);
	}

  if (line.includes("focus")){
    var ch_focus = parseInt(line[line.indexOf("focus")+6]);
    proto_frame[3] = ch_focus;
  }
}

function parse_img(line, type){
  if (line.includes("image=")){
    var img_start = line.indexOf("image=") + 7;
    var img_end = line.indexOf('"', img_start);
    return append_url(line.slice(img_start, img_end), type);
  }
  else
    return "";
}

function wipe(){//wipe the current frame pictures/focus for the next one.
  proto_frame[0] = "";
  proto_frame[1] = "";
  proto_frame[2] = "";
  proto_frame[3] = "";
}

function append_url(img, type){
  if (type == "character"){
    var rep_index = img.indexOf("#"); //if not found, don't need to do anything.
    if ((img[rep_index -1] == "_") || (!isNaN(img[rep_index -1]))){
      //i.e. ifrit_5#7
      img = img.replace(/#|1#|2#|3#|4#|5#|6#|7#|8#|9#/g, "");//get rid of the 1# to be in line with the image.
    }
    else if (rep_index != -1){
      //i.e. grani#3
      img = img.replace(/#|1#|2#|3#|4#|5#|6#|7#|8#|9#/g, "_");
    }
    img = url_filepath + "character/" + img + ".png";
  }
  if (type=="image"){
    img = url_filepath + "images/" + img + ".png";
  }
  if (type=="bg"){
    img = url_filepath + "backgrounds/" + img + ".png";
  }
  return img;
}

function set_decision_list(line){
  var reg = /(?<=")(?:\\.|[^"\\])*(?=")/;
  var res = reg.exec(line)[0];


  var dec_list = res.split(';'); //List of text decisions.  Array.
  proto_frame[8] = dec_list;

}

function set_decision_value(line){//takes predicate line, sets
  var reg = /(?<=")(?:\\.|[^"\\])*(?=")/;//get decision value.
  var dec_value = reg.exec(line)[0];
  proto_frame[9] = dec_value;

  if (dec_value != 1){
    frame_list[frame_list.length -1][7] = "Branch_End";//set the previous frame to branch end.
    //Since it's back-assigning, shouldn't need to worry about the proto_frame repeating it.
  }
  if (dec_value.split(';').length == proto_frame[8].length){//predicate = predicate_end, set type to "predicate_end"
    proto_frame[7] = "Decision_End";
    proto_frame[8] = "";
    proto_frame[9] = "";
  }
}

////////////////////////////////////////////////
/////Optimization Functions
////////////////////////////////////////////////
function check_asset_preload(img){
  if (!asset_preload.includes(img)){
    asset_preload.push(img);
  }
}

function load_assets(){
  //preload all the assets in asset_preload.
  for (img in asset_preload){
    document.getElementById("ch_center").src = img;
  }
  document.getElementById("ch_center").src = "";
}

////////////////////////////////////////////////
//Frames to VN
////////////////////////////////////////////////

var story_index = null; //current index of the story.
function initialize_reader(){
  story_index = 0;
  next_step(frame_list[story_index]);
}
//navigation functions

function next(){
  if (frame_list[story_index][7] == "Decision"){
    return;
  }
  else if (frame_list[story_index][7] == "Branch_End"){
    //skip to the end of the branch.
    goto_decision_end(story_index);
  }
  else if ((typeof frame_list[story_index+1] != 'undefined')){//check if can.
    story_index = (story_index+1);
    next_step(frame_list[story_index]);
  }

  else {return;}
}

function back(){
  //Find if backing on a predicate, skip to decision.
  if ((frame_list[story_index][7] == "Predicate")||(frame_list[story_index][7] == "Decision_End")){
    get_previous_decision(story_index);
  }
  else if ((typeof frame_list[story_index-1] != 'undefined')){
    story_index -= 1;
    next_step(frame_list[story_index]);
  }
  else {return;}
}

function skip_to(pos){
  if (typeof frame_list[pos] != 'undefined'){
    story_index = pos;
    document.getElementById("text").innerHTML = "";
    next_step(frame_list[pos]);
  }
  else {return;}
}

//execution of the frame

function next_step(frame){//execute the line given via cases.
  console.log(frame[7]);
  $('#decision_list').empty(); //remove the decisions after deciding.
  scrub();

  if (frame[7] == "Decision"){
    decision(frame);
  }
  character(frame);
  dialogue(frame);
  set_img(frame);
  set_bg(frame);

}

//////////////////////////////////
//Individual line type functions.
/////////////////////////////////
function character(frame){
//assuming that just the "character name" is what's stored in the frame.
	if (frame[0] != null){
    document.getElementById("ch_left").src = frame[0];
  }
  if (frame[1] != null){
      document.getElementById("ch_right").src = frame[1];
  }
  if (frame[2] != null){
        document.getElementById("ch_center").src = frame[2];
  }
  if (frame[3] != 0){
    //focus
    if (frame[3] == 1){
      document.getElementById("ch_right").classList.add("darken");
    }
    else if (frame[3] == -1){
      document.getElementById("ch_center").classList.add("darken");
    }
    else {document.getElementById("ch_left").classList.add("darken");}
  }
  else {return;}
}

function dialogue(frame){ //display the dialogue.
  document.getElementById("text").innerHTML = check_replace(frame[4]);
}

function set_img(frame){
  if (frame[5] != ""){
    document.getElementById("VN_image").src = frame[5];
  }
  else { //scrub the image when there is no image parameter.
    document.getElementById("VN_image").src = "";
  }
}

function set_bg(frame){
  //main difference between this and img is that it is the lowest layer.
  //and it doesn't necessarily get cleared, only shifted.  Else, they usually
  //use images for shaking artwork/tweening/cg's.
  if (frame[6] != ""){
    document.getElementById("bg").src = frame[6];
  }
}


function decision(frame){
  //lock next/back button
  in_decision = true;
  //get and set decision end value:
  var decision_list = frame[8];
  //parse into button list for choices.
  var decision_number = 1;

  for (var choice of decision_list){
    var decision_button = document.createElement('input');
    decision_button.type = "button";
    decision_button.value = choice;
    var dec_val = decision_number;
    //need some persistence for setting the callback function;
    //instead of having an individual value for each button, it references
    //the same value.
    var create_branch = function(arg){return function(){find_branch(arg);}};
    decision_button.addEventListener('click', create_branch(dec_val));

    //add custom css for the buttons.
    decision_button.classList.add("decisions");
    //decision_button.top = (decision_number*10 + 5).toString() + "%";

    document.getElementById("decision_list").appendChild(decision_button);
    decision_number +=1;
  }
  //show decision buttons.
}


////////////////////////////////////
//Helper Functions.
////////////////////////////////////

function scrub(){//remove the pictures so the new ones are displayed.
  document.getElementById("ch_left").src = "";
  document.getElementById("ch_left").classList.remove('darken');
  document.getElementById("ch_right").src = "";
  document.getElementById("ch_right").classList.remove('darken');
  document.getElementById("ch_center").src = "";
  document.getElementById("ch_center").classList.remove('darken');
}

function scale_text(res=2.5){
  const div_percent = .35;
  document.getElementById("text").style.setProperty('font-size', res.toFixed(2) + "vh");
  var div_h = document.getElementById("bg").getBoundingClientRect().height;
  var text_h = document.getElementById("text").getBoundingClientRect().height;

  if ((div_h != 0) && (text_h > div_percent*div_h)){
      res = res * .9;
      scale_text(res);
  }
}

function check_replace(line, replace_phrase="{@nickname}"){
  //Replace a phrase with another phrase.
  var uid = null;
  var res = null;
  //get username if logged in. uid = getUID;
  if (uid){
    res = line.replace(replace_phrase/g, uid);
  }
  else{ //'default is just to spell out Doctor'
    line.replace(/Dr.|Dr|Doctor/g, "");
    var rep = new RegExp(replace_phrase, "g");
    res = line.replace(rep, "Doctor");
  }
  return(res);
}
////////////////////////////////
//Branch and Decision related functions
//////////////////////////////////

function find_branch(dec_val){//Get the index of the branch to return.
  var search_index = story_index+1;
  while (!((frame_list[search_index][9] == dec_val) && (frame_list[search_index][7] == "Predicate") || (frame_list[search_index][7] == "Decision_End"))){
    search_index += 1;
  }
  skip_to(search_index);
}

function goto_decision_end(index){
  var search_index = index;
  while (!(frame_list[search_index][7] == "Decision_End")){
    search_index +=1;
  }
  skip_to(search_index);
}

function get_previous_decision(index){
  var search_index = index;
  while (!(frame_list[search_index][7] == "Decision")){
    search_index -= 1;
  }
  console.log(search_index);
  skip_to(search_index);
}
