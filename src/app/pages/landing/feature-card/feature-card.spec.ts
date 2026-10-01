import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeatureCard } from './feature-card';

describe('FeatureCard', () => {
  let component: FeatureCard;
  let fixture: ComponentFixture<FeatureCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureCard],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureCard);
    component = fixture.componentInstance;

    // `icon` et `title` sont requis : sans eux le composant ne compile pas.
    fixture.componentRef.setInput('icon', 'school');
    fixture.componentRef.setInput('title', 'Un titre');

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le titre recu', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h3')?.textContent).toContain('Un titre');
  });

  it('omet le paragraphe quand la description est vide', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('p')).toBeNull();
  });
});
