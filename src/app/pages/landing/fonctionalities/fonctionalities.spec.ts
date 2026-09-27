import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Fonctionalities } from './fonctionalities';

describe('Fonctionalities', () => {
  let component: Fonctionalities;
  let fixture: ComponentFixture<Fonctionalities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fonctionalities],
    }).compileComponents();

    fixture = TestBed.createComponent(Fonctionalities);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
