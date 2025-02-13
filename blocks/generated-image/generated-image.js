export default async function decorate(block) {
  const generatedImage = sessionStorage.getItem('generatedImage');
  if (generatedImage) {
    const newImg = document.createElement('img');
    newImg.setAttribute('alt', '');
    newImg.src = generatedImage;
    block.appendChild(newImg);
  }
}