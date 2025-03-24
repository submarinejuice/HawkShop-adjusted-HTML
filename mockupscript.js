document.addEventListener("DOMContentLoaded", function () {
  const canvas = new fabric.Canvas('canvas');
  canvas.setWidth(500);
  canvas.setHeight(600);

  fabric.Image.fromURL('images/61ogc05nK3L._AC_UY1000_.jpg', function (bgImg) {
      canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas), {
          originX: 'left',
          originY: 'top',
          scaleX: canvas.width / bgImg.width,
          scaleY: canvas.height / bgImg.height,
      });
  }, { crossOrigin: 'Anonymous' });

  const dropzone = document.getElementById('dropzone');

  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());

  dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.backgroundColor = "rgba(255,255,255,0.9)";
  });

  dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.backgroundColor = "rgba(255,255,255,0.8)";
  });

  const printArea = {
      left: 100,
      top: 100,
      width: 300,
      height: 400,
  };

  function constrainImage(img) {
      img.on('moving', function () {
          img.left = Math.max(printArea.left, Math.min(img.left, printArea.left + printArea.width - img.getScaledWidth()));
          img.top = Math.max(printArea.top, Math.min(img.top, printArea.top + printArea.height - img.getScaledHeight()));
          canvas.renderAll();
      });

      img.on('scaling', function () {
          const newWidth = img.getScaledWidth();
          const newHeight = img.getScaledHeight();

          if (newWidth > printArea.width || newHeight > printArea.height) {
              const scaleX = Math.min(printArea.width / img.width, 1);
              const scaleY = Math.min(printArea.height / img.height, 1);
              img.scaleX = scaleX;
              img.scaleY = scaleY;
          }

          img.left = Math.max(printArea.left, Math.min(img.left, printArea.left + printArea.width - img.getScaledWidth()));
          img.top = Math.max(printArea.top, Math.min(img.top, printArea.top + printArea.height - img.getScaledHeight()));
          canvas.renderAll();
      });
  }

  dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.display = 'none';

      const file = e.dataTransfer.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = function (event) {
              fabric.Image.fromURL(event.target.result, function (img) {
                  img.set({
                      left: printArea.left + printArea.width / 4,
                      top: printArea.top + printArea.height / 4,
                      scaleX: 0.5,
                      scaleY: 0.5,
                  });
                  canvas.add(img);
                  constrainImage(img);
                  canvas.renderAll();
              });
          };
          reader.readAsDataURL(file);
      }
  });

  document.getElementById('download-design').addEventListener('click', function () {
      canvas.renderAll();
      const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0 });
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'custom-design.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  });

  document.querySelector('.colors').addEventListener('click', function(event){
      if (event.target.classList.contains('color-option')) {
          const color = event.target.dataset.color;
          console.log("color selected:", color);
      }
  });

  document.querySelector('#size-form').addEventListener('click', function(event){
      if (event.target.classList.contains('size-option')) {
          const size = event.target.dataset.size;
          console.log("size selected:", size);
      }
  });
  let currentView = 'front';

  function changeShirtView(view) {
      currentView = view;
      changeShirtColor(selectedColor); // Use the global selectedColor
  }

  function changeShirtColor(color) {
      let imgSrc;
      switch (currentView) {
          case 'front':
              switch (color) {
                  case 'white':
                      imgSrc = 'images/white-shirt-front.avif';
                      break;
                  case 'laurier-purple':
                      imgSrc = 'images/61htRzcrRsS._AC_SX679_.jpg';
                      break;
                  case 'goose-grey':
                      imgSrc = 'images/goose-grey-front.jpg';
                      break;
                  case 'golden-hawk-gold':
                      imgSrc = 'images/golden-hawk-gold.avif';
                      break;
                  default:
                      imgSrc = 'images/61htRzcrRsS._AC_SX679_.jpg';
              }
              break;
          case 'back':
              switch (color) {
                  case 'white':
                      imgSrc = 'images/white-shirt-back.webp';
                      break;
                  case 'laurier-purple':
                      imgSrc = 'images/front-purple-shirt.jpg';
                      break;
                  case 'goose-grey':
                      imgSrc = 'images/goose-grey-back.jfif';
                      break;
                  case 'golden-hawk-gold':
                      imgSrc = 'images/golden-hawk-gold-back.avif';
                      break;
                  default:
                      imgSrc = 'images/front-purple-shirt.jpg';
              }
              break;
          default:
              imgSrc = 'images/61htRzcrRsS._AC_SX679_.jpg';
      }
      fabric.Image.fromURL(imgSrc, function (bgImg) {
          canvas.setBackgroundImage(bgImg, canvas.renderAll.bind(canvas), {
              originX: 'left',
              originY: 'top',
              scaleX: canvas.width / bgImg.width,
              scaleY: canvas.height / bgImg.height,
          });
      }, {
          crossOrigin: 'Anonymous',
          onerror: function (message) {
              console.error('Error loading image:', message);
          }
      });
  }

  // Event listeners using querySelectorAll
  document.querySelectorAll('.colors .color-option').forEach(button => {
      button.addEventListener('click', () => {
          document.querySelectorAll('.colors .color-option').forEach(btn => btn.classList.remove('selected'));
          button.classList.add('selected');
          selectedColor = button.dataset.color; // Update global variable
          changeShirtColor(selectedColor);
      });
  });

  document.querySelectorAll('.view-selection .view-option').forEach(button => {
      button.addEventListener('click', () => {
          changeShirtView(button.dataset.view);
      });
  });
  
  
});