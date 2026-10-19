export class InteractionPrompt {
  public readonly element: HTMLElement;
  private readonly textSpan: HTMLElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.id = 'interaction-prompt';
    this.element.className = 'interaction-prompt hidden';

    this.textSpan = document.createElement('span');
    this.textSpan.className = 'interaction-prompt-text';
    this.element.appendChild(this.textSpan);

    parent.appendChild(this.element);
  }

  show(text: string): void {
    this.textSpan.textContent = text;
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
