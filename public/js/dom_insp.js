var DomInspElement = null;

$(function(){
    $("#DomInsp_loading").css("display", "none");
    
    $(".DomInspPage *").each(function(){
        $(this).mouseover(function(e){
            e.stopPropagation();
            
            var sWidth = $(this).width();
            var sHeight = $(this).height();
            var sElement = DomInsp.elementtostring($(this));
                       
            $(this).showBalloon({contents: sElement+" "+sWidth+"px x "+sHeight+"px", showDuration: 0, hideDuration: 0});
            $(this).addClass("outlineElement");            
        });
        
        $(this).mouseout(function(e){
            e.stopPropagation();
            $(this).hideBalloon();
            $(this).removeClass("outlineElement");
        });
        
        $(this).click(function(e){
            e.preventDefault(); 
            e.stopPropagation();
            
            switch($(this).prop('tagName')){
                case "A":
                    $(".DomInspGo").css("display", "block");
                break;
                default: 
                    $(".DomInspGo").css("display", "none");
                break;
            }

            var position = $(this).offset();
            var top = position.top+$(this).height();
            
            $(".outlineElement_click").removeClass("outlineElement_click");
            $(this).addClass("outlineElement_click");
           
            if($(this).width() > 500)
                $(".DomInsp_dropMenu").css({"display": "block", "top": position.top+"px", "left": (position.left+(($(this).width()/2)-150))+"px"});
            else if($(this).height() > 100)
                $(".DomInsp_dropMenu").css({"display": "block", "top": position.top+"px", "left": (position.left+$(this).width())+"px"});
            else
                $(".DomInsp_dropMenu").css({"display": "block", "top": top+"px", "left": position.left+"px"});

            DomInspElement = $(this);
        });
    });
    
    $("iframe").each(function(){
        var sWidth = $(this).attr("width");
        var sHeight = $(this).attr("height");
        var sTop = $(this).offset().top;
        var sLeft = $(this).offset().left;
        
        $(this).parent().append("<div class='iframe_block' style='width:"+sWidth+"px; height: "+sHeight+"px; top:"+sTop+"px; left:"+sLeft+"px'></div>");
    });
    
    $("body").click(function(e){
        e.stopPropagation();
        $(".DomInsp_dropMenu").css({"display": "none"});
        $(".outlineElement_click").removeClass("outlineElement_click");
    });
    
    var ignored = ocalStorage.getItem("ignored_"+window.location.hostname);
    
    if(!ignored){
        ignored.forEach(function(query){
            $(query).addClass(outlineElement_ignored);
        });
    }
});

var DomInsp = {    
    elementtostring: function($this){
        var sTagname = $this.prop('tagName');//toLowerCase()
        var sID = (typeof $this.attr("id") != "undefined") ? "#"+$this.attr("id") : "";
        var sClass = (typeof $this.attr('class') != "undefined" && sID == "") ? $this.attr('class') : "";

        if(typeof sClass == "string" && sClass != "")
            sClass = "."+str_replace(" ", " .", trim(sClass.split(" ")[0]));

        if(sClass == ".outlineElement")
            sClass = "";

        if(typeof sTagname == "string")
            return sTagname.toLowerCase()+sID+sClass;
        else
            return "";
    },
    
    elementpath: function($this){
        var i = 3;
        var sPath = "";

        do{
            var sElement = DomInsp.elementtostring($this);
            sElement = trim(sElement);

            if(typeof sElement == "string" && sElement != ""){
                if(sElement != "div.DomInspPage"){
                    sPath = sElement + " " + sPath;
                    $this = $this.parent();
                }
                else{
                    break;
                }
            }
            else{
                break;
            }

            i--;
        }while(i > 0);

        return sPath;
    }
};

function DomInspCopyvalue(){
    var preview = [];

    $(DomInsp.elementpath(DomInspElement)).each(function(){
        switch($(this).prop('tagName')){
            case "A": preview.push($(this).html()); break;
            case "INPUT": preview.push($(this).val()); break;
            case "IMG": value = $(this).attr("src"); break;
            default: preview.push($(this).html()); break;
        }
    });
    
    parent.postMessage({
        "action": "extract",
        "query": DomInsp.elementpath(DomInspElement),
        "type": "value",
        "preview": preview
    }, "*"); 

    $(".DomInsp_dropMenu").css({"display": "none"});
}

function DomInspIngored(){
    $(DomInspElement).addClass("outlineElement_ignored");
    
    var ignored = ocalStorage.getItem("ignored_"+window.location.hostname);
    
    if(!ignored)
        ignored = [];
    
    ignored.push(DomInsp.elementpath(DomInspElement));
    localStorage.setItem("ignored_"+window.location.hostname, ignored);
    
    parent.postMessage({
        "action": "ignored",
        "query": DomInsp.elementpath(DomInspElement)
    }, "*"); 
}

function DomInspGo(){
    parent.postMessage({
        "action": "go",
        "url": DomInspElement.attr("href")
    }, "*");

    $(".DomInsp_dropMenu").css({"display": "none"});
}
          

function str_replace(search, replace, subject, count) {
  var i = 0,
    j = 0,
    temp = '',
    repl = '',
    sl = 0,
    fl = 0,
    f = [].concat(search),
    r = [].concat(replace),
    s = subject,
    ra = Object.prototype.toString.call(r) === '[object Array]',
    sa = Object.prototype.toString.call(s) === '[object Array]';
  s = [].concat(s);
  if (count) {
    this.window[count] = 0;
  }

  for (i = 0, sl = s.length; i < sl; i++) {
    if (s[i] === '') {
      continue;
    }
    for (j = 0, fl = f.length; j < fl; j++) {
      temp = s[i] + '';
      repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
      s[i] = (temp)
        .split(f[j])
        .join(repl);
      if (count && s[i] !== temp) {
        this.window[count] += (temp.length - s[i].length) / f[j].length;
      }
    }
  }
  return sa ? s : s[0];
}

function trim(str, charlist) {
  var whitespace, l = 0,
    i = 0;
  str += '';

  if (!charlist) {
    // default list
    whitespace =
      ' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000';
  } else {
    // preg_quote custom list
    charlist += '';
    whitespace = charlist.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
  }

  l = str.length;
  for (i = 0; i < l; i++) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(i);
      break;
    }
  }

  l = str.length;
  for (i = l - 1; i >= 0; i--) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(0, i + 1);
      break;
    }
  }

  return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
}