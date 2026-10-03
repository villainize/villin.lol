$(function(){

  $("#floatMovie").find(".wrap").click(function(){
    $("#floatMovie").velocity({opacity:0},{
      duration:200,
      complete:function(){
        $(this).hide();
        $(this).find(".player").empty();
      }
    })
  })

  $(".movie_btn").click(function(){
    var id = $(this).attr("data-id");
    var iframe = '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/'+ id +'?rel=0&showinfo=0&autoplay=1" frameborder="0" allowfullscreen></iframe>';
    $("#floatMovie").find(".player").html(iframe);

    $("#floatMovie").show().velocity({opacity:1},{
      duration:200
    })
  })

  return $('.story__scene-inner').slick({
    dots: false,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    centerMode: true,
    // variableWidth: true,
    autoplay: true,
    autoplaySpeed: 3000,
    // arrows: false,
    easing: 'easeOutExpo',
    centerPadding:'40px',
    responsive: [{
      breakpoint: 768,
      settings: {
        centerPadding:'3.7%',
        centerMode: true
      }
    }]
  });
})