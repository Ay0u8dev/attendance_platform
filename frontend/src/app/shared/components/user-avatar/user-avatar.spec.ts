import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  let fixture: ComponentFixture<UserAvatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAvatar],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAvatar);
  });

  it('renders a trimmed profile image when imageUrl is available', () => {
    fixture.componentRef.setInput('name', 'Marie Dupont');
    fixture.componentRef.setInput('imageUrl', '  https://example.com/student.jpg  ');
    fixture.detectChanges();

    const image = avatarElement().querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://example.com/student.jpg');
    expect(image?.getAttribute('alt')).toBe('Marie Dupont');
  });

  it('falls back to initials when imageUrl is blank', () => {
    fixture.componentRef.setInput('name', 'Marie Dupont');
    fixture.componentRef.setInput('imageUrl', '   ');
    fixture.detectChanges();

    expect(avatarElement().querySelector('img')).toBeNull();
    expect(avatarElement().textContent?.trim()).toBe('MD');
  });

  it('falls back to initials when the image fails to load', () => {
    fixture.componentRef.setInput('name', 'Marie Dupont');
    fixture.componentRef.setInput('imageUrl', 'https://example.com/broken.jpg');
    fixture.detectChanges();

    const image = avatarElement().querySelector('img');
    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(avatarElement().querySelector('img')).toBeNull();
    expect(avatarElement().textContent?.trim()).toBe('MD');
  });

  it('computes a fallback for missing names', () => {
    fixture.componentRef.setInput('name', '');
    fixture.detectChanges();

    expect(avatarElement().textContent?.trim()).toBe('??');
  });

  function avatarElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
