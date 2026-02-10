
/**
 * @license
 * Copyright Wallace, Jayden
 * SPDX-License-Identifier: Apache-2.0
 */

interface DesignSettings {
  fontFamily: string;
  colorScheme: string;
  layoutStyle: string;
  buttonStyle: string;
}

interface ColorScheme {
  primary: string;
  bg: string;
  text: string;
}

interface OfferData {
  vehicle?: string;
  title?: string;
  details?: string;
  imagePosition?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaColor?: string;
  ctaTextColor?: string;
  disclaimer?: string;
  imageDataUrl?: string;
  imageAlt?: string;
  imageLink?: string;
}

interface FooterCta {
  text: string;
  link: string;
}

interface EmailData {
  emailStyle: string;
  bodyContent: string;
  bodyBackgroundColor: string;
  heroMessage?: string;
  heroMessageColor?: string;
  heroMessageFontSize?: string;
  heroMessageBgColor?: string;
  heroImage: string;
  heroImageAlt?: string;
  heroImageLink?: string;
  ctaText: string;
  ctaLink: string;
  ctaColor: string;
  ctaTextColor: string;
  offers: OfferData[];
  disclaimer: string;
  fontFamily: string;
  footerCtas: FooterCta[];
  footerBackgroundColor: string;
  footerCtaBgColor: string;
  footerCtaTextColor: string;
  buttonStyle: string;
  layoutStyle: string;
}

// Interface for LocalStorage data
interface SavedTemplate {
    id: string;
    name: string;
    createdAt: string;
    designSettings: DesignSettings;
    staticFields: Record<string, string>;
    offerBlocks: Array<Record<string, string>>; // Structure of offers
    footerCtaBlocks: Array<Record<string, string>>; // Structure of footer CTAs
    imageSources?: {
      hero: 'upload' | 'url',
      offers: Record<string, 'upload' | 'url'>
    }
}

// Design and visual customization settings
const designSettings: DesignSettings = {
  fontFamily: "'Arial', sans-serif",
  colorScheme: 'modern',
  layoutStyle: 'centered',
  buttonStyle: 'rounded'
};

const schemeColors: Record<string, ColorScheme> = {
  modern: { primary: '#007aff', bg: '#ffffff', text: '#1d1d1f' },
  warm: { primary: '#ff6b35', bg: '#fff8f5', text: '#2d1810' },
  elegant: { primary: '#6366f1', bg: '#fafafa', text: '#1e293b' },
  nature: { primary: '#10b981', bg: '#f0fdf4', text: '#14532d' },
  corporate: { primary: '#374151', bg: '#ffffff', text: '#111827' },
  vibrant: { primary: '#ec4899', bg: '#fdf2f8', text: '#831843' }
};

// DOM Elements
const emailForm = document.getElementById('email-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const outputContainer = document.getElementById('output-container') as HTMLElement;
const outputPlaceholder = document.getElementById('output-placeholder') as HTMLElement;
const previewPane = document.getElementById('preview-pane') as HTMLIFrameElement;

// Sidebar elements
const designSidebar = document.getElementById('design-sidebar');
const mergeFieldsSidebar = document.getElementById('merge-fields-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Toggle buttons
const designToggle = document.getElementById('floating-design-btn');
const mergeFieldsToggle = document.getElementById('merge-fields-toggle');
const floatingMergeBtn = document.getElementById('floating-merge-btn');

// Close buttons
const closeDesignSidebar = document.getElementById('close-design-sidebar');
const closeMergeSidebar = document.getElementById('close-sidebar');

// Dynamic Section Elements
const offersContainer = document.getElementById('offers-container') as HTMLElement;
const addOfferBtn = document.getElementById('add-offer-btn') as HTMLButtonElement;
let nextOfferIndex = 1;

const footerCtasContainer = document.getElementById('footer-ctas-container') as HTMLElement;
const addFooterCtaBtn = document.getElementById('add-footer-cta-btn') as HTMLButtonElement;
let nextFooterCtaIndex = 1;

// Saved Template Elements
const saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
const savedTemplatesList = document.getElementById('saved-templates-list') as HTMLElement;

// Utility functions
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const getContrastColor = (hexColor: string): string => {
  if (!hexColor) return '#333333';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (brightness > 125) ? '#333333' : '#ffffff';
};

// Function to resize the iframe to fit its content
const resizeDesktopPreview = () => {
    // Ensure we are in desktop view and the iframe content is accessible
    if (previewPane.classList.contains('desktop') && previewPane.contentWindow && previewPane.contentWindow.document.body) {
      const contentHeight = previewPane.contentWindow.document.body.scrollHeight;
      // Set a minimum height for smaller emails, but allow it to grow
      previewPane.style.height = `${Math.max(contentHeight, 600)}px`;
    }
  };

// Email HTML generation
const generateEmailHtml = (data: EmailData): string => {
  const {
    bodyContent,
    heroMessage,
    heroMessageColor,
    heroMessageFontSize,
    heroMessageBgColor,
    heroImage,
    heroImageAlt,
    heroImageLink,
    ctaText,
    ctaLink,
    ctaColor,
    ctaTextColor,
    offers,
    disclaimer,
    bodyBackgroundColor,
    fontFamily,
    footerCtas,
    footerBackgroundColor,
    footerCtaBgColor,
    footerCtaTextColor,
    buttonStyle,
    layoutStyle,
  } = data;

  const mainButtonColor = ctaColor || '#4f46e5';
  const mainBodyBg = bodyBackgroundColor || '#ffffff';
  const mainBodyTextColor = getContrastColor(mainBodyBg);
  const emailFont = fontFamily || "'Arial', sans-serif";
  const msoFont = emailFont.split(',')[0].replace(/'/g, '').trim();
  const footerBg = footerBackgroundColor || '#ffffff';
  const footerButtonBg = footerBg;
  const footerButtonBgColor = footerCtaBgColor || '#4f46e5';

  // Layout Style modifications
  const layoutStyles = {
    mainContainerStyle: '',
    spacerHeight: '20px',
  };
  if (layoutStyle === 'card-style') {
    layoutStyles.mainContainerStyle = 'border: 1px solid #e2e8f0;';
  } else if (layoutStyle === 'minimal') {
    layoutStyles.spacerHeight = '30px';
  }

  const renderButton = (text: string, link: string, color: string, style: string, bgColor: string, options: { width: string; height: string; fontSize: string; }, textColorOverride?: string) => {
    let borderRadius: string;
    let msoArcSize: string;
    let border: string;
    let backgroundColor: string;
    let textColor: string;
    let msoFillColor: string;
    let msoTextColor: string;

    switch (style) {
      case 'pill':
        borderRadius = '9999px'; msoArcSize = '50%'; border = 'none';
        backgroundColor = color; textColor = textColorOverride || getContrastColor(color);
        break;
      case 'square':
        borderRadius = '0px'; msoArcSize = '0%'; border = 'none';
        backgroundColor = color; textColor = textColorOverride || getContrastColor(color);
        break;
      case 'outlined':
        borderRadius = '8px'; msoArcSize = '13%'; border = `1px solid ${color}`;
        backgroundColor = bgColor; textColor = textColorOverride || color;
        break;
      case 'rounded':
      default:
        borderRadius = '8px'; msoArcSize = '13%'; border = 'none';
        backgroundColor = color; textColor = textColorOverride || getContrastColor(color);
        break;
    }

    msoFillColor = style === 'outlined' ? color : backgroundColor;
    msoTextColor = textColor;

    return `<div><!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:${options.height};v-text-anchor:middle;width:${options.width};" arcsize="${msoArcSize}" strokecolor="${color}" fillcolor="${msoFillColor}">
        <w:anchorlock/>
        <center style="color:${msoTextColor};font-family:${msoFont}, sans-serif;font-size:${options.fontSize};font-weight:bold;">${text}</center>
      </v:roundrect>
    <![endif]--><a href="${link}"
    style="background-color:${backgroundColor};border:${border};border-radius:${borderRadius};color:${textColor};display:inline-block;font-family:${emailFont};font-size:${options.fontSize};font-weight:bold;line-height:${options.height};text-align:center;text-decoration:none;width:${options.width};-webkit-text-size-adjust:none;mso-hide:all;">${text}</a></div>`;
  };

  const renderOffer = (offer: OfferData): string => {
    if (!offer.title && !offer.vehicle && !offer.details && !offer.imageDataUrl && !offer.ctaText) return '';
    
    const offerButtonColor = offer.ctaColor || '#4f46e5';
    const imagePosition = offer.imagePosition || 'left';
    
    const textContent = `
      <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #4a5568;">${offer.vehicle || ''}</h3>
      <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: #1a202c;">${offer.title || ''}</h2>
      <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">${offer.details?.replace(/\n/g, '<br />') || ''}</p>
      ${ offer.ctaText && offer.ctaLink ?
        renderButton(offer.ctaText, offer.ctaLink, offerButtonColor, buttonStyle, '#ffffff', { width: '150px', height: '40px', fontSize: '14px'}, offer.ctaTextColor)
        : ''
      }
      ${ offer.disclaimer ? `<p style="margin: 15px 0 0 0; font-size: 8px; color: #718096; line-height: 1.5;">${offer.disclaimer.replace(/\n/g, '<br />')}</p>` : '' }
    `;

    if (!offer.imageDataUrl) {
      return `
        <tr>
          <td style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <div style="font-family: ${emailFont}; color: #333333;">
              ${textContent}
            </div>
          </td>
        </tr>
        <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>`;
    }

    const imgTag = `<img src="${offer.imageDataUrl}" alt="${offer.imageAlt || offer.title || 'Offer Image'}" width="${imagePosition === 'top' ? '560' : '240'}" style="display: block; width: 100%; max-width: ${imagePosition === 'top' ? '100%' : '240px'}; height: auto; border: 0; border-radius: 8px;">`;
    const linkedImg = offer.imageLink ? `<a href="${offer.imageLink}" style="text-decoration: none;">${imgTag}</a>` : imgTag;

    if (imagePosition === 'top') {
      return `
        <tr>
          <td style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  ${linkedImg}
                </td>
              </tr>
              <tr>
                <td style="font-family: ${emailFont}; color: #333333;">
                  ${textContent}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>`;
    } else if (imagePosition === 'right') {
      return `
        <tr>
          <td style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td valign="top" style="font-family: ${emailFont}; color: #333333; padding-right: 20px;">
                  ${textContent}
                </td>
                <td width="240" valign="top">
                  ${linkedImg}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>`;
    } else {
      return `
        <tr>
          <td style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="240" valign="top" style="padding-right: 20px;">
                  ${linkedImg}
                </td>
                <td valign="top" style="font-family: ${emailFont}; color: #333333;">
                  ${textContent}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>`;
    }
  };

  const offersHtml = offers.map(renderOffer).join('');

  const footerCtasHtml = footerCtas && footerCtas.length > 0 ? `
    <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>
    <tr>
      <td style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: ${footerBg};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tbody>
            ${footerCtas.map((cta, index) => {
              return `
              <tr>
                <td align="center" style="padding-bottom: ${index < footerCtas.length - 1 ? '15px' : '0'};">
                  ${renderButton(cta.text, cta.link, footerButtonBgColor, buttonStyle, footerButtonBg, { width: '250px', height: '40px', fontSize: '14px' }, footerCtaTextColor)}
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </td>
    </tr>
  ` : '';

  const heroImgTag = `<img src="${heroImage}" alt="${heroImageAlt || 'Hero Image'}" width="600" style="width: 100%; max-width: 600px; height: auto; margin: auto; display: block; border-radius: 8px;">`;
  const linkedHeroImg = heroImageLink ? `<a href="${heroImageLink}" style="text-decoration: none;">${heroImgTag}</a>` : heroImgTag;

  const heroMessageHtml = heroMessage ? `
  <tr>
    <td align="center" bgcolor="${heroMessageBgColor || 'transparent'}" style="padding: 20px; background-color: ${heroMessageBgColor || 'transparent'}; font-family: ${emailFont}; font-size: ${heroMessageFontSize || '24'}px; line-height: 1.3; color: ${heroMessageColor || '#1d1d1f'}; font-weight: bold; border-radius: 8px;">
      ${heroMessage.replace(/\n/g, '<br />')}
    </td>
  </tr>
  <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>
  ` : '';

  return `
  <!DOCTYPE html>
  <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <!--[if mso]>
          <style>
              * {
                  font-family: ${msoFont}, sans-serif !important;
              }
          </style>
      <![endif]-->
      <style>
          html, body {
              margin: 0 auto !important;
              padding: 0 !important;
              height: 100% !important;
              width: 100% !important;
              background: #f1f3f5;
          }
          * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
          img { -ms-interpolation-mode:bicubic; }
          a { text-decoration: none; }
          @media screen and (max-width: 600px) {
              .email-container {
                  width: 100% !important;
                  margin: auto !important;
              }
          }
      </style>
  </head>
  <body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f1f3f5;">
      <center style="width: 100%; background-color: #f1f3f5;">
          <div style="max-width: 600px; margin: 0 auto;" class="email-container">
              <!--[if mso]>
              <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
              <tr>
              <td>
              <![endif]-->
              <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;">
                  <tr>
                      <td style="padding: 20px; font-family: ${emailFont}; font-size: 15px; line-height: 1.5; color: #333333;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tbody>
                            ${ heroImage ? `
                            <tr>
                              <td>
                                ${linkedHeroImg}
                              </td>
                            </tr>
                            <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>
                            ` : ''
                          }
                          ${heroMessageHtml}
                            <tr>
                                <td style="padding: 10px 20px; background-color: ${mainBodyBg}; border-radius: 8px; ${layoutStyles.mainContainerStyle}">
                                    <p style="margin: 0; color: ${mainBodyTextColor};">${bodyContent.replace(/\n/g, '<br />')}</p>
                                </td>
                            </tr>
                            <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>
                            ${ ctaText && ctaLink ? `
                            <tr>
                                <td align="center">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center">
                                              ${renderButton(ctaText, ctaLink, mainButtonColor, buttonStyle, mainBodyBg, { width: '200px', height: '50px', fontSize: '16px' }, ctaTextColor)}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr><td style="font-size: ${layoutStyles.spacerHeight}; line-height: ${layoutStyles.spacerHeight};">&nbsp;</td></tr>
                            `: ''}
                            ${offersHtml}
                            ${footerCtasHtml}
                            ${ disclaimer ? `
                            <tr>
                                <td style="text-align: center; padding: 20px; font-family: ${emailFont}; font-size: 8px; line-height: 1.5; color: #718096;">
                                    ${disclaimer.replace(/\n/g, '<br />')}
                                </td>
                            </tr>
                            ` : '' }
                          </tbody>
                        </table>
                      </td>
                  </tr>
              </table>
              <!--[if mso]>
              </td>
              </tr>
              </table>
              <![endif]-->
          </div>
      </center>
  </body>
  </html>`;
};

// Sidebar functionality
const openDesignSidebar = (): void => {
  designSidebar?.classList.add('open');
  mergeFieldsSidebar?.classList.remove('open');
  sidebarOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
};

const closeSidebarFunc = (): void => {
  designSidebar?.classList.remove('open');
  mergeFieldsSidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
};

const openMergeSidebar = (): void => {
  mergeFieldsSidebar?.classList.add('open');
  designSidebar?.classList.remove('open');
  sidebarOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
};

// Event listeners for sidebar toggles
designToggle?.addEventListener('click', openDesignSidebar);
mergeFieldsToggle?.addEventListener('click', openMergeSidebar);
floatingMergeBtn?.addEventListener('click', openMergeSidebar);
closeDesignSidebar?.addEventListener('click', closeSidebarFunc);
closeMergeSidebar?.addEventListener('click', closeSidebarFunc);
sidebarOverlay?.addEventListener('click', closeSidebarFunc);

// Design option handlers
const fontSelect = document.getElementById('design-font-family') as HTMLSelectElement;
fontSelect?.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  designSettings.fontFamily = target.value;
  console.log('Font updated:', designSettings.fontFamily);
});

// Color Picker Functionality
const setupColorPicker = (container: HTMLElement | Document) => {
    container.querySelectorAll('.color-input-container').forEach(wrapper => {
        const colorInput = wrapper.querySelector('input[type="color"]') as HTMLInputElement;
        const swatch = wrapper.querySelector('.color-swatch-display') as HTMLElement;
        if (colorInput && swatch) {
            // Sync swatch color with input value
            swatch.style.backgroundColor = colorInput.value;
            // Add listener to update swatch on color change
            colorInput.addEventListener('input', () => {
                swatch.style.backgroundColor = colorInput.value;
            });
        }
    });
};

const updateColorInput = (id: string, color: string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
        input.value = color;
        // Dispatch an 'input' event to trigger our custom listener to update the swatch
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

// Color scheme selection
document.querySelectorAll('.color-scheme-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.color-scheme-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    const dataset = (option as HTMLElement).dataset;
    const schemeName = dataset.scheme || 'modern';
    designSettings.colorScheme = schemeName;

    const colors = schemeColors[schemeName];
    if (colors) {
        updateColorInput('hero_message_bg_color', colors.bg);
        updateColorInput('body_bg_color', colors.bg);
        updateColorInput('cta_color', colors.primary);
        updateColorInput('cta_text_color', getContrastColor(colors.primary));
        
        document.querySelectorAll<HTMLInputElement>('input[id^="offer_cta_color_"]').forEach(input => {
            updateColorInput(input.id, colors.primary);
        });
        document.querySelectorAll<HTMLInputElement>('input[id^="offer_cta_text_color_"]').forEach(input => {
            updateColorInput(input.id, getContrastColor(colors.primary));
        });

        updateColorInput('footer_bg_color', colors.bg);
        updateColorInput('footer_cta_bg_color', colors.primary);
        updateColorInput('footer_cta_text_color', getContrastColor(colors.primary));
    }
    console.log('Color scheme updated:', designSettings.colorScheme);
  });
});

// Layout style selection
document.querySelectorAll('.layout-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.layout-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    const dataset = (option as HTMLElement).dataset;
    designSettings.layoutStyle = dataset.layout || 'centered';
    console.log('Layout updated:', designSettings.layoutStyle);
  });
});

// Button style selection
document.querySelectorAll('.button-style-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.button-style-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    const dataset = (option as HTMLElement).dataset;
    designSettings.buttonStyle = dataset.button || 'rounded';
    console.log('Button style updated:', designSettings.buttonStyle);
  });
});

// Accordion functionality
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling as HTMLElement;
    const icon = header.querySelector('span') as HTMLElement;
    const isOpen = content.classList.contains('open');

    // Close all other accordions
    document.querySelectorAll('.accordion-content').forEach(c => {
      c.classList.remove('open');
    });
    document.querySelectorAll('.accordion-header span').forEach(i => {
      (i as HTMLElement).style.transform = 'rotate(0deg)';
    });

    // Toggle current accordion
    if (!isOpen) {
      content.classList.add('open');
      icon.style.transform = 'rotate(180deg)';
    }
  });
});

// Dynamic form sections (Offers & Footer CTAs)

// Toggle Image Source
const toggleImageSource = (index: number | 'hero', type: 'upload' | 'url') => {
  const isHero = index === 'hero';
  const prefix = isHero ? 'hero-img' : `offer-img-${index}`;
  const uploadBtn = document.getElementById(isHero ? 'hero-img-btn-upload' : `offer-img-btn-upload-${index}`);
  const urlBtn = document.getElementById(isHero ? 'hero-img-btn-url' : `offer-img-btn-url-${index}`);
  const uploadContainer = document.getElementById(isHero ? 'hero-img-upload-container' : `offer_img_upload_container_${index}`);
  const urlContainer = document.getElementById(isHero ? 'hero-img-url-container' : `offer_img_url_container_${index}`);

  if (type === 'upload') {
      uploadBtn?.classList.add('active');
      urlBtn?.classList.remove('active');
      uploadContainer?.classList.remove('hidden');
      urlContainer?.classList.add('hidden');
  } else {
      uploadBtn?.classList.remove('active');
      urlBtn?.classList.add('active');
      uploadContainer?.classList.add('hidden');
      urlContainer?.classList.remove('hidden');
  }
}

// Hero Image Toggles
document.getElementById('hero-img-btn-upload')?.addEventListener('click', () => toggleImageSource('hero', 'upload'));
document.getElementById('hero-img-btn-url')?.addEventListener('click', () => toggleImageSource('hero', 'url'));


// --- Offers Logic ---
const setupOfferImagePreview = (index: number) => {
  const offerImageInput = document.getElementById(`offer_image_${index}`) as HTMLInputElement;
  const offerImagePreview = document.getElementById(`offer_image_preview_${index}`) as HTMLImageElement;
  const offerImageUrlInput = document.getElementById(`offer_image_url_${index}`) as HTMLInputElement;

  // Handle file upload preview
  if (offerImageInput && offerImagePreview) {
    offerImageInput.addEventListener('change', async (event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        try {
          const imageDataUrl = await readFileAsDataURL(input.files[0]);
          offerImagePreview.src = imageDataUrl;
        } catch (error) {
          console.error(`Error reading file for offer ${index}:`, error);
          offerImagePreview.src = `https://placehold.co/200x200/f1f3f5/6c757d?text=Image`;
        }
      } else if (!offerImageUrlInput.value) { // Don't reset if URL might be used
        offerImagePreview.src = `https://placehold.co/200x200/f1f3f5/6c757d?text=Image`;
      }
    });
  }

  // Handle URL preview
  if (offerImageUrlInput && offerImagePreview) {
      offerImageUrlInput.addEventListener('input', () => {
          if (offerImageUrlInput.value && !offerImageUrlInput.parentElement?.classList.contains('hidden')) {
              offerImagePreview.src = offerImageUrlInput.value;
          }
      });
  }
};

const createOfferBlockHtml = (index: number): string => `
  <div class="offer-block" id="offer-block-${index}">
    <div class="offer-header">
      <h4 class="text-xl">Offer ${index}</h4>
      ${index > 1 ? `<button type="button" class="btn btn-secondary btn-sm remove-offer-btn" data-offer-index="${index}" style="padding: 4px 8px; font-size: 12px; border-color: var(--destructive); color: var(--destructive); background: transparent;">Remove</button>` : ''}
    </div>
    <div class="offer-body">
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
        <label class="form-label" style="text-align: center;">Offer Image</label>
        <img id="offer_image_preview_${index}" src="https://placehold.co/200x200/f1f3f5/6c757d?text=Image" alt="Offer ${index} image preview" class="offer-image-preview"/>
        
        <!-- Toggle -->
        <div class="toggle-group mb-2" style="width: fit-content; align-self: center;">
          <button type="button" class="toggle-btn active image-source-toggle" id="offer-img-btn-upload-${index}" data-offer-index="${index}" data-type="upload">Upload</button>
          <button type="button" class="toggle-btn image-source-toggle" id="offer-img-btn-url-${index}" data-offer-index="${index}" data-type="url">URL</button>
        </div>

        <div id="offer_img_upload_container_${index}">
            <input type="file" id="offer_image_${index}" name="offer_image_${index}" accept="image/png, image/jpeg" class="form-control"/>
        </div>
        <div id="offer_img_url_container_${index}" class="hidden">
            <input type="text" id="offer_image_url_${index}" name="offer_image_url_${index}" placeholder="https://example.com/image.jpg" class="form-control" />
        </div>

        <div class="grid grid-cols-2" style="gap: 8px;">
           <div class="form-group" style="margin-bottom:0;">
             <label class="form-label" style="font-size: 12px;">Alt Text</label>
             <input type="text" id="offer_image_alt_${index}" name="offer_image_alt_${index}" placeholder="Description" class="form-control"/>
           </div>
           <div class="form-group" style="margin-bottom:0;">
             <label class="form-label" style="font-size: 12px;">Image Link</label>
             <input type="text" id="offer_image_link_${index}" name="offer_image_link_${index}" placeholder="https://" class="form-control"/>
           </div>
        </div>

        <div class="form-group">
          <label for="offer_image_position_${index}" class="form-label">Image Position</label>
          <select id="offer_image_position_${index}" name="offer_image_position_${index}" class="form-control">
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top">Top</option>
          </select>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
        <div class="form-group">
          <label for="offer_vehicle_${index}" class="form-label">Vehicle / Product</label>
          <input type="text" id="offer_vehicle_${index}" name="offer_vehicle_${index}" placeholder="e.g., 2024 Honda Civic" class="form-control"/>
        </div>
        <div class="form-group">
          <label for="offer_title_${index}" class="form-label">Offer Title</label>
          <input type="text" id="offer_title_${index}" name="offer_title_${index}" placeholder="e.g., Lease for $299/mo" class="form-control"/>
        </div>
        <div class="form-group">
          <label for="offer_details_${index}" class="form-label">Offer Details</label>
          <textarea id="offer_details_${index}" name="offer_details_${index}" rows="3" placeholder="e.g., 36-month lease, $3,000 down." class="form-control"></textarea>
        </div>
        <div class="grid grid-cols-2">
          <div class="form-group">
            <label for="offer_cta_text_${index}" class="form-label">CTA Text</label>
            <input type="text" id="offer_cta_text_${index}" name="offer_cta_text_${index}" placeholder="View Inventory" class="form-control"/>
          </div>
          <div class="form-group">
            <label for="offer_cta_link_${index}" class="form-label">CTA Link</label>
            <input type="text" id="offer_cta_link_${index}" name="offer_cta_link_${index}" placeholder="https://example.com/specials" class="form-control"/>
          </div>
        </div>
        <div class="form-group form-group-inline">
          <div class="form-group">
            <label for="offer_cta_color_${index}" class="form-label">CTA BG</label>
            <div class="color-input-container">
              <input type="color" id="offer_cta_color_${index}" name="offer_cta_color_${index}" value="#4f46e5" class="color-input-hidden">
              <div class="color-swatch-display" style="background-color: #4f46e5;"></div>
            </div>
          </div>
          <div class="form-group">
            <label for="offer_cta_text_color_${index}" class="form-label">CTA Text</label>
            <div class="color-input-container">
              <input type="color" id="offer_cta_text_color_${index}" name="offer_cta_text_color_${index}" value="#ffffff" class="color-input-hidden">
              <div class="color-swatch-display" style="background-color: #ffffff;"></div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="offer_disclaimer_${index}" class="form-label">Disclaimer</label>
          <textarea id="offer_disclaimer_${index}" name="offer_disclaimer_${index}" rows="2" placeholder="e.g., W.A.C. See dealer for details." class="form-control"></textarea>
        </div>
      </div>
    </div>
  </div>`;

const addOffer = () => {
    if (offersContainer.children.length >= 5) return;

    const newOfferHtml = createOfferBlockHtml(nextOfferIndex);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newOfferHtml;
    const newOfferElement = tempDiv.firstElementChild as HTMLElement;

    if (newOfferElement) {
        offersContainer.appendChild(newOfferElement);
        setupOfferImagePreview(nextOfferIndex);
        setupColorPicker(newOfferElement);

        const currentSchemeName = document.querySelector('.color-scheme-option.selected')?.getAttribute('data-scheme') || 'modern';
        const colors = schemeColors[currentSchemeName];
        if (colors) {
            updateColorInput(`offer_cta_color_${nextOfferIndex}`, colors.primary);
            updateColorInput(`offer_cta_text_color_${nextOfferIndex}`, getContrastColor(colors.primary));
        }

        nextOfferIndex++;
        if (offersContainer.children.length >= 5) {
            addOfferBtn.disabled = true;
            addOfferBtn.textContent = 'Maximum Offers Reached';
        }
    }
    return newOfferElement;
};

addOfferBtn.addEventListener('click', () => addOffer());

offersContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Remove handler
    if (target.classList.contains('remove-offer-btn')) {
        const index = target.dataset.offerIndex;
        const blockToRemove = document.getElementById(`offer-block-${index}`);
        if (blockToRemove) {
            blockToRemove.remove();
            if (offersContainer.children.length < 5) {
                addOfferBtn.disabled = false;
                addOfferBtn.textContent = 'Add Another Offer';
            }
        }
    }

    // Toggle handler
    if (target.classList.contains('image-source-toggle')) {
      const index = parseInt(target.dataset.offerIndex || '0');
      const type = target.dataset.type as 'upload' | 'url';
      if (index && type) {
        toggleImageSource(index, type);
      }
    }
});

// --- Footer CTAs Logic ---
const createFooterCtaBlockHtml = (index: number): string => `
  <div class="card mb-4" id="footer-cta-block-${index}">
    <div class="card-header">
      <h4 class="text-lg">Link ${index}</h4>
      ${index > 1 ? `<button type="button" class="btn btn-secondary btn-sm remove-footer-cta-btn" data-cta-index="${index}" style="padding: 4px 8px; font-size: 12px; border-color: var(--destructive); color: var(--destructive); background: transparent;">Remove</button>` : ''}
    </div>
    <div class="card-body">
      <div class="grid grid-cols-2">
        <div class="form-group">
          <label for="footer_cta_text_${index}" class="form-label">Link Text</label>
          <input type="text" id="footer_cta_text_${index}" name="footer_cta_text_${index}" placeholder="Get In Touch" class="form-control">
        </div>
        <div class="form-group">
          <label for="footer_cta_link_${index}" class="form-label">Link URL</label>
          <input type="text" id="footer_cta_link_${index}" name="footer_cta_link_${index}" placeholder="{{dealership.tracked_website_homepage_no_lp_url}}" class="form-control">
        </div>
      </div>
    </div>
  </div>`;

const addFooterCta = () => {
    if (footerCtasContainer.children.length >= 3) return;

    const newCtaHtml = createFooterCtaBlockHtml(nextFooterCtaIndex);
    footerCtasContainer.insertAdjacentHTML('beforeend', newCtaHtml);
    nextFooterCtaIndex++;
    
    if (footerCtasContainer.children.length >= 3) {
        addFooterCtaBtn.disabled = true;
        addFooterCtaBtn.textContent = 'Maximum Links Reached';
    }
};

addFooterCtaBtn.addEventListener('click', addFooterCta);

footerCtasContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('remove-footer-cta-btn')) {
        const index = target.dataset.ctaIndex;
        const blockToRemove = document.getElementById(`footer-cta-block-${index}`);
        if (blockToRemove) {
            blockToRemove.remove();
            if (footerCtasContainer.children.length < 3) {
                addFooterCtaBtn.disabled = false;
                addFooterCtaBtn.textContent = 'Add Another Link';
            }
        }
    }
});

// --- Saving and Loading Logic ---

const STORAGE_KEY = 'curator_craftor_templates';

const getSavedTemplates = (): SavedTemplate[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const saveTemplate = (name: string) => {
    // 1. Collect Design Settings
    const currentDesignSettings = { ...designSettings };

    // 2. Collect Static Fields (excluding file inputs)
    const formData = new FormData(emailForm);
    const staticFields: Record<string, string> = {};
    const staticInputIds = [
        'hero_message', 'hero_message_bg_color', 'hero_message_color', 'hero_message_font_size',
        'email-body', 'body_bg_color',
        'cta', 'cta_link', 'cta_color', 'cta_text_color',
        'footer_bg_color', 'footer_cta_bg_color', 'footer_cta_text_color',
        'disclaimer',
        // New Hero Image Fields
        'hero_image_url', 'hero_image_alt', 'hero_image_link'
    ];

    staticInputIds.forEach(id => {
        const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
        if (element) {
            staticFields[id] = element.value;
        }
    });

    // 3. Collect Offer Blocks Data
    const offerBlocks: Array<Record<string, string>> = [];
    const offerImageSources: Record<string, 'upload' | 'url'> = {};

    document.querySelectorAll<HTMLElement>('#offers-container .offer-block').forEach((block) => {
        const index = block.id.split('-')[2];
        const offerData: Record<string, string> = {};
        
        // Fields to save per offer
        const offerFields = [
            'offer_image_position_', 'offer_vehicle_', 'offer_title_', 
            'offer_details_', 'offer_cta_text_', 'offer_cta_link_', 
            'offer_cta_color_', 'offer_cta_text_color_', 'offer_disclaimer_',
            // New Offer Image Fields
            'offer_image_url_', 'offer_image_alt_', 'offer_image_link_'
        ];

        offerFields.forEach(prefix => {
            const inputId = `${prefix}${index}`;
            const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (input) {
                offerData[prefix] = input.value;
            }
        });

        // Save Source Type
        const uploadBtn = document.getElementById(`offer-img-btn-upload-${index}`);
        offerImageSources[`offer_${index}`] = uploadBtn?.classList.contains('active') ? 'upload' : 'url';

        offerBlocks.push(offerData);
    });

    // 4. Collect Footer CTA Blocks Data
    const footerCtaBlocks: Array<Record<string, string>> = [];
    document.querySelectorAll<HTMLElement>('#footer-ctas-container .card').forEach((block) => {
        const index = block.id.split('-')[3]; // footer-cta-block-X
        const ctaData: Record<string, string> = {};
        
        const ctaFields = ['footer_cta_text_', 'footer_cta_link_'];
        ctaFields.forEach(prefix => {
            const inputId = `${prefix}${index}`;
            const input = document.getElementById(inputId) as HTMLInputElement;
            if (input) {
                ctaData[prefix] = input.value;
            }
        });
        
        footerCtaBlocks.push(ctaData);
    });

    // Collect Hero Source
    const heroUploadBtn = document.getElementById('hero-img-btn-upload');
    const heroSource = heroUploadBtn?.classList.contains('active') ? 'upload' : 'url';

    const newTemplate: SavedTemplate = {
        id: Date.now().toString(),
        name,
        createdAt: new Date().toISOString(),
        designSettings: currentDesignSettings,
        staticFields,
        offerBlocks,
        footerCtaBlocks,
        imageSources: {
          hero: heroSource,
          offers: offerImageSources
        }
    };

    const templates = getSavedTemplates();
    templates.unshift(newTemplate); // Add to top
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    renderSavedTemplatesList();
    alert('Template saved successfully! (Note: Uploaded images are not saved, but Image URLs are.)');
};

const deleteTemplate = (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const templates = getSavedTemplates().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    renderSavedTemplatesList();
};

const loadTemplate = (template: SavedTemplate) => {
    if (!confirm('Loading this template will overwrite your current changes. Continue?')) return;

    // 1. Restore Design Settings
    Object.assign(designSettings, template.designSettings);
    
    // Update Sidebar UI for design settings
    const fontSelect = document.getElementById('design-font-family') as HTMLSelectElement;
    if (fontSelect) fontSelect.value = designSettings.fontFamily;

    // Update color scheme UI selection
    document.querySelectorAll('.color-scheme-option').forEach(opt => {
        if ((opt as HTMLElement).dataset.scheme === designSettings.colorScheme) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });

    // Update layout style UI selection
    document.querySelectorAll('.layout-option').forEach(opt => {
        if ((opt as HTMLElement).dataset.layout === designSettings.layoutStyle) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });

    // Update button style UI selection
    document.querySelectorAll('.button-style-option').forEach(opt => {
        if ((opt as HTMLElement).dataset.button === designSettings.buttonStyle) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });

    // 2. Restore Static Fields
    Object.entries(template.staticFields).forEach(([id, value]) => {
        const input = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
        if (input) {
            input.value = value;
            // Trigger color input update if needed
            if (input.type === 'color') {
                updateColorInput(id, value);
            }
        }
    });

    // Restore Hero Image Source Type
    if (template.imageSources?.hero) {
      toggleImageSource('hero', template.imageSources.hero);
    }

    // 3. Restore Offers
    offersContainer.innerHTML = '';
    nextOfferIndex = 1;
    addOfferBtn.disabled = false;
    addOfferBtn.textContent = 'Add Another Offer';

    template.offerBlocks.forEach((offerData, i) => {
        // Create the HTML structure
        const offerEl = addOffer(); 
        const currentIndex = nextOfferIndex - 1; // addOffer increments, so we want the one just added

        // Restore Source Type
        // Note: offerBlocks index corresponds to creation order.
        // We need to match based on how we stored it.
        // Simplified: Since we clear and rebuild, the index `i` maps to stored logic but `currentIndex` is the ID.
        // But `addOffer` increments `nextOfferIndex`.
        // The saved `offerImageSources` uses keys `offer_X` from the *saved* state.
        // Since we are reconstructing, we can't easily map old IDs to new IDs if there were gaps.
        // However, `offerBlocks` is an array. We can infer source type from the array if we stored it in the array or by index.
        // The current `imageSources.offers` uses ID keys. This is tricky if IDs were `1, 3, 4`.
        // Let's rely on the fact we are rebuilding sequentially: 1, 2, 3...
        // We will default to 'upload' if mapping fails, or try to guess.
        // Actually, let's just default to upload unless we have data in the `offerData` that suggests URL (e.g. `offer_image_url_` has value).
        
        // Better: Check if `offer_image_url_` has value in `offerData`. If so, switch to URL view.
        // The saved keys in `offerData` have the OLD index suffix (e.g. `offer_vehicle_5`).
        // We need to strip suffix and apply to `currentIndex`.
        
        let hasUrl = false;

        Object.entries(offerData).forEach(([key, value]) => {
            // key is like `offer_vehicle_1`. We want `offer_vehicle_{currentIndex}`.
            const parts = key.split('_');
            const suffix = parts.pop(); // the number
            const base = parts.join('_') + '_'; // `offer_vehicle_`
            
            const newInputId = `${base}${currentIndex}`;
            const input = document.getElementById(newInputId) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            
            if (input) {
                input.value = value;
                if (input.type === 'color') {
                    updateColorInput(newInputId, value);
                }
                if (key.includes('offer_image_url_') && value) {
                    hasUrl = true;
                }
            }
        });

        if (hasUrl) {
            toggleImageSource(currentIndex, 'url');
            // Update preview
            const preview = document.getElementById(`offer_image_preview_${currentIndex}`) as HTMLImageElement;
            const urlInput = document.getElementById(`offer_image_url_${currentIndex}`) as HTMLInputElement;
            if (preview && urlInput) preview.src = urlInput.value;
        } else {
            toggleImageSource(currentIndex, 'upload');
        }
    });

    // 4. Restore Footer CTAs
    footerCtasContainer.innerHTML = '';
    nextFooterCtaIndex = 1;
    addFooterCtaBtn.disabled = false;
    addFooterCtaBtn.textContent = 'Add Another Link';

    template.footerCtaBlocks.forEach((ctaData) => {
        addFooterCta();
        const currentIndex = nextFooterCtaIndex - 1;
        
        Object.entries(ctaData).forEach(([key, value]) => {
            const parts = key.split('_');
            parts.pop();
            const base = parts.join('_') + '_';
            const newInputId = `${base}${currentIndex}`;

            const input = document.getElementById(newInputId) as HTMLInputElement;
            if (input) {
                input.value = value;
            }
        });
    });

    alert('Template loaded! Please re-upload any files.');
};

const renderSavedTemplatesList = () => {
    const templates = getSavedTemplates();
    savedTemplatesList.innerHTML = '';

    if (templates.length === 0) {
        savedTemplatesList.innerHTML = '<p class="text-sm" style="color: var(--label-secondary); text-align: center;">No saved templates found.</p>';
        return;
    }

    templates.forEach(t => {
        const date = new Date(t.createdAt).toLocaleDateString();
        const div = document.createElement('div');
        div.className = 'saved-template-item';
        div.style.cssText = `
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px; 
            border: 1px solid var(--separator-secondary); 
            border-radius: var(--radius-md); 
            margin-bottom: 8px; 
            background: var(--background-primary);
        `;
        
        div.innerHTML = `
            <div>
                <div style="font-weight: 600; color: var(--label-primary);">${t.name}</div>
                <div style="font-size: 12px; color: var(--label-secondary);">Saved: ${date}</div>
            </div>
            <div class="flex gap-2">
                <button type="button" class="btn btn-secondary btn-sm load-template-btn">Load</button>
                <button type="button" class="btn btn-secondary btn-sm delete-template-btn" style="color: var(--destructive); border-color: var(--destructive);">Delete</button>
            </div>
        `;

        const loadBtn = div.querySelector('.load-template-btn') as HTMLButtonElement;
        const deleteBtn = div.querySelector('.delete-template-btn') as HTMLButtonElement;

        loadBtn.addEventListener('click', () => loadTemplate(t));
        deleteBtn.addEventListener('click', () => deleteTemplate(t.id));

        savedTemplatesList.appendChild(div);
    });
};

saveTemplateBtn.addEventListener('click', () => {
    const name = prompt('Enter a name for this template:');
    if (name && name.trim()) {
        saveTemplate(name.trim());
    }
});

// Initialize form
const initializeForm = () => {
    addOffer();
    addFooterCta();
    setupColorPicker(document);
    renderSavedTemplatesList();
};
initializeForm();


// Form submission with design settings
emailForm.addEventListener('submit', async (e: Event) => {
  e.preventDefault();

  const btnText = generateBtn.querySelector('.btn-text') as HTMLElement;
  const spinner = generateBtn.querySelector('.spinner') as HTMLElement;
  const checkmark = generateBtn.querySelector('.checkmark') as HTMLElement;

  // Start loading state
  generateBtn.disabled = true;
  btnText.textContent = 'Generating Template...';
  spinner.classList.remove('hidden');
  checkmark.classList.add('hidden');
  generateBtn.classList.remove('btn-success');


  try {
    const formData = new FormData(emailForm);
    const emailStyle = formData.get('email-style') as string || 'modern';
    const bodyContent = formData.get('email-body') as string;
    const bodyBackgroundColor = formData.get('body_bg_color') as string;
    const ctaText = formData.get('cta') as string;
    const ctaLink = formData.get('cta_link') as string;
    const ctaColor = formData.get('cta_color') as string;
    const ctaTextColor = formData.get('cta_text_color') as string;
    const mainDisclaimer = formData.get('disclaimer') as string;
    const heroMessage = formData.get('hero_message') as string;
    const heroMessageColor = formData.get('hero_message_color') as string;
    const heroMessageFontSize = formData.get('hero_message_font_size') as string;
    const heroMessageBgColor = formData.get('hero_message_bg_color') as string;
    
    // Hero Image Logic
    const heroPhotoFile = formData.get('photo') as File;
    const heroImageUrl = formData.get('hero_image_url') as string;
    const heroImageAlt = formData.get('hero_image_alt') as string;
    const heroImageLink = formData.get('hero_image_link') as string;

    let heroImageDataUrl = '';
    // Priority: File > URL (if active? or just if present?)
    // Simplest is: if file present, use it. Else if url present, use it.
    // Better: Check active tab.
    const heroUploadBtn = document.getElementById('hero-img-btn-upload');
    const isHeroUploadActive = heroUploadBtn?.classList.contains('active');

    if (isHeroUploadActive && heroPhotoFile && heroPhotoFile.size > 0) {
      heroImageDataUrl = await readFileAsDataURL(heroPhotoFile);
    } else if (heroImageUrl) {
      heroImageDataUrl = heroImageUrl;
    }

    const offersData: OfferData[] = [];
    for (const offerBlock of document.querySelectorAll<HTMLElement>('#offers-container .offer-block')) {
        const i = offerBlock.id.split('-')[2];
        const vehicle = formData.get(`offer_vehicle_${i}`) as string;
        const title = formData.get(`offer_title_${i}`) as string;
        const details = formData.get(`offer_details_${i}`) as string;
        const ctaText = formData.get(`offer_cta_text_${i}`) as string;
        
        // Offer Image Logic
        const offerImageFile = formData.get(`offer_image_${i}`) as File;
        const offerImageUrl = formData.get(`offer_image_url_${i}`) as string;
        const offerImageAlt = formData.get(`offer_image_alt_${i}`) as string;
        const offerImageLink = formData.get(`offer_image_link_${i}`) as string;

        const uploadBtn = document.getElementById(`offer-img-btn-upload-${i}`);
        const isUploadActive = uploadBtn?.classList.contains('active');
        
        let offerImageDataUrl = '';
        if (isUploadActive && offerImageFile && offerImageFile.size > 0) {
          offerImageDataUrl = await readFileAsDataURL(offerImageFile);
        } else if (offerImageUrl) {
          offerImageDataUrl = offerImageUrl;
        }

        if (vehicle || title || details || ctaText || offerImageDataUrl) {
            const imagePosition = formData.get(`offer_image_position_${i}`) as string || 'left';
            
            offersData.push({
              vehicle,
              title,
              details,
              imagePosition,
              ctaText: ctaText,
              ctaLink: formData.get(`offer_cta_link_${i}`) as string,
              ctaColor: formData.get(`offer_cta_color_${i}`) as string,
              ctaTextColor: formData.get(`offer_cta_text_color_${i}`) as string,
              disclaimer: formData.get(`offer_disclaimer_${i}`) as string,
              imageDataUrl: offerImageDataUrl,
              imageAlt: offerImageAlt,
              imageLink: offerImageLink
            });
        }
    }

    const footerCtasData: FooterCta[] = [];
    for (const ctaBlock of document.querySelectorAll<HTMLElement>('#footer-ctas-container .card')) {
        const i = ctaBlock.id.split('-')[3];
        const text = formData.get(`footer_cta_text_${i}`) as string;
        const link = formData.get(`footer_cta_link_${i}`) as string;
        if (text && link) {
            footerCtasData.push({ text, link });
        }
    }

    const footerBackgroundColor = formData.get('footer_bg_color') as string;
    const footerCtaBgColor = formData.get('footer_cta_bg_color') as string;
    const footerCtaTextColor = formData.get('footer_cta_text_color') as string;

    const emailData: EmailData = {
      emailStyle,
      bodyContent,
      bodyBackgroundColor,
      heroMessage,
      heroMessageColor,
      heroMessageFontSize,
      heroMessageBgColor,
      heroImage: heroImageDataUrl,
      heroImageAlt,
      heroImageLink,
      ctaText,
      ctaLink,
      ctaColor,
      ctaTextColor,
      offers: offersData,
      disclaimer: mainDisclaimer,
      fontFamily: designSettings.fontFamily,
      footerCtas: footerCtasData,
      footerBackgroundColor,
      footerCtaBgColor,
      footerCtaTextColor,
      buttonStyle: designSettings.buttonStyle,
      layoutStyle: designSettings.layoutStyle,
    };

    // Simulate generation with design settings
    setTimeout(() => {
      outputPlaceholder.style.display = 'none';
      outputContainer.style.display = 'grid';

      // Generate email with design settings
      const emailHtml = generateEmailHtml(emailData);

      const codeBlock = document.getElementById('code-block') as HTMLElement;

      codeBlock.textContent = emailHtml;

      // Set up the onload event to resize the iframe AFTER the content has been loaded
      previewPane.onload = () => {
        resizeDesktopPreview();
        // Clear the onload handler to prevent it from firing again on subsequent loads
        previewPane.onload = null;
      };

      previewPane.srcdoc = emailHtml; // This triggers the load event

      // Success state
      spinner.classList.add('hidden');
      generateBtn.classList.add('btn-success');
      checkmark.classList.remove('hidden');
      btnText.textContent = 'Complete';

      // Revert button after a delay
      setTimeout(() => {
        generateBtn.disabled = false;
        generateBtn.classList.remove('btn-success');
        checkmark.classList.add('hidden');
        btnText.textContent = 'Generate Template';
      }, 2000);

      console.log('Generated with settings:', designSettings);
    }, 2000);

  } catch (error) {
    console.error(error);
    outputPlaceholder.innerHTML = `<p>An error occurred. Please check the console for details and try again.</p>`;
    outputPlaceholder.style.display = 'flex';
    outputContainer.style.display = 'none';

    // Reset button on error
    generateBtn.disabled = false;
    btnText.textContent = 'Generate Template';
    spinner.classList.add('hidden');
    checkmark.classList.add('hidden');
    generateBtn.classList.remove('btn-success');
  }
});

// View toggle functionality
const desktopBtn = document.getElementById('desktop-view-btn') as HTMLButtonElement;
const mobileBtn = document.getElementById('mobile-view-btn') as HTMLButtonElement;

desktopBtn?.addEventListener('click', () => {
  desktopBtn.classList.add('active');
  mobileBtn.classList.remove('active');
  previewPane.className = 'preview-frame desktop';
  // Call resize function when switching to desktop view
  resizeDesktopPreview();
});

mobileBtn?.addEventListener('click', () => {
  mobileBtn.classList.add('active');
  desktopBtn.classList.remove('active');
  previewPane.className = 'preview-frame mobile';
  // Remove the inline height style so the CSS class can define the height
  previewPane.style.height = '';
});

// Copy functionality
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
copyBtn?.addEventListener('click', async () => {
  const codeBlock = document.getElementById('code-block') as HTMLElement;
  
  try {
    await navigator.clipboard.writeText(codeBlock.textContent || '');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});

// Download functionality
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
downloadBtn?.addEventListener('click', () => {
  const codeBlock = document.getElementById('code-block') as HTMLElement;
  if (!codeBlock.textContent) return;
  
  try {
    const blob = new Blob([codeBlock.textContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-template.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download HTML:', err);
  }
});

// Merge field insertion
let lastFocusedInput: HTMLInputElement | HTMLTextAreaElement | null = null;

document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[type="text"], textarea').forEach(input => {
  input.addEventListener('focus', () => {
    lastFocusedInput = input;
  });
});

document.querySelectorAll('.merge-field-item').forEach(item => {
  item.addEventListener('click', () => {
    const value = (item as HTMLElement).dataset.value;
    if (value && lastFocusedInput) {
      const start = lastFocusedInput.selectionStart || 0;
      const end = lastFocusedInput.selectionEnd || 0;
      const text = lastFocusedInput.value;
      
      lastFocusedInput.value = text.substring(0, start) + value + text.substring(end);
      lastFocusedInput.focus();
      lastFocusedInput.setSelectionRange(start + value.length, start + value.length);
      
      closeSidebarFunc();
    }
  });
});

// Close sidebars on escape key
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeSidebarFunc();
  }
});
