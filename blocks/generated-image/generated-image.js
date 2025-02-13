export default async function decorate(block) {
  const generatedImage = sessionStorage.getItem('generatedImage');
  const buttonContainer = block.querySelector('.button-container');
  const button = buttonContainer.querySelector('.button')
  if (generatedImage) {
    const newImg = document.createElement('img');
    newImg.setAttribute('alt', '');
    newImg.src = generatedImage;
    buttonContainer.insertAdjacentElement('beforebegin', newImg);
  }

  button.addEventListener('click', () => {
    sessionStorage.removeItem('generatedImage');
  });
}
