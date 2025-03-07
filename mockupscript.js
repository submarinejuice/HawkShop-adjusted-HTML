// u have to add a prevention to having the browser by default open up the file you want to drop, essentially blocking default. 
document.addEventListener("dragover", function(e){
  e.preventDefault();
});
document.addEventListener("drop", function(e) {
  e.preventDefault();

});

document.addEventListener("DOMContentLoaded", function(){
  const canvas = new fabric.Canvas('canvas');
    canvas.setWidth(500);
    canvas.setHeight(600);

  fabric.Image.fromURL('', function(bgImg) {
    canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas), {
      originX: 'left',
      originY: 'top',
      scaleX: canvas.width / bgImg.width,
      scaley: canvas.height / bgImg.height
    });
  
  }, {crossOrigin: 'Anonymous'});

  const dropzone = document.getElementById('dropzone');
  
  dropzone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropzone.style.backgroundColor = "rgba(255,255,255,0.9)";
    
  });

  dropzone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    dropzone.style.backgroundColor = "rgba(255,255,255,0.8)";

  });
  dropzone.addEventListener('drop', function(e) {
    e.preventDefault();

    dropzone.style.display = 'none';

    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        fabric.Image.fromURL(event.target.result, function(img) {
          img.set({
            left:100,
            top:100,
            scaleX: 0.5,
            scaleY: 0.5,
          });
        canvas.add(img);
        canvas.renderAll();
       });
      };
      reader.readAsDataURL(file);
    }
  });
  document.getElementById('submit').addEventListener('click', function() {
    canvas.renderAll();
    const dataURL = canvas.toDataURL({format: 'png', quality: 1.0});
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'custom-design.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    
  });
  //todo, FIX TTHE FACT THAT U CAN LOOSE THE DAMNNN IMAGE WTFFFFF so much to be fixed tbh, we just gotta #lockin

});