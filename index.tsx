/**
 * @license
 * Copyright Wallace, Jayden
 * SPDX-License-Identifier: Apache-2.0
 */
import DOMPurify from 'dompurify';

interface DesignSettings {
  fontFamily: string;
  buttonStyle: string;
  offersLayout: 'list' | 'grid';
  globalBodyColor: string;
  globalLinkColor: string;
  globalFontSize: string;
  colorScheme?: string;
  preheaderText?: string;
}

const COLOR_SCHEMES = [
  { id: 'classic',  name: 'Classic',   bodyColor: '#1d1d1f', accentColor: '#007aff' },
  { id: 'midnight', name: 'Midnight',  bodyColor: '#0a0a0a', accentColor: '#f5a623' },
  { id: 'ocean',    name: 'Ocean',     bodyColor: '#1e3a5f', accentColor: '#00b4d8' },
  { id: 'forest',   name: 'Forest',    bodyColor: '#1b4332', accentColor: '#52b788' },
  { id: 'slate',    name: 'Slate',     bodyColor: '#2d3748', accentColor: '#667eea' },
  { id: 'ember',    name: 'Ember',     bodyColor: '#2d2d2d', accentColor: '#e53e3e' },
  { id: 'rosegold', name: 'Rose Gold', bodyColor: '#3d1515', accentColor: '#c9657e' },
  { id: 'mono',     name: 'Mono',      bodyColor: '#000000', accentColor: '#666666' },
] as const;

type TemplateStatus = 'open' | 'building' | 'review' | 'pending' | 'approved';

const TEMPLATE_STATUSES: { value: TemplateStatus; label: string }[] = [
    { value: 'open',     label: 'Open'     },
    { value: 'building', label: 'Building' },
    { value: 'review',   label: 'Review'   },
    { value: 'pending',  label: 'Pending'  },
    { value: 'approved', label: 'Approved' },
];

interface SavedTemplate {
    id: string;
    name: string;
    createdAt: string;
    updatedAt?: string;
    designSettings: DesignSettings;
    components: EmailComponent[];
    dealershipId?: string;
    status?: TemplateStatus;
}

interface SavedLibraryComponent {
    id: string;
    name: string;
    type: string;
    data: Record<string, string>;
    createdAt: string;
    updatedAt?: string;
    dealershipId?: string;
}

interface DealershipGroup {
    id: string;
    name: string;
    defaultBodyColor: string;
    defaultAccentColor: string;
    defaultColorSchemeId?: string;
    defaultFontFamily?: string;
    defaultButtonStyle?: string;
    createdAt: string;
}

interface EmailComponent {
    id: string;
    type: string;
    data: Record<string, string>;
    librarySourceId?: string;
}

interface MergeFieldItem {
  label: string;
  value: string;
}

interface MergeFieldGroup {
  title: string;
  items?: MergeFieldItem[];
  subgroups?: { title: string; items: MergeFieldItem[] }[];
}

interface ActiveField {
    componentId: string;
    fieldKey: string;
    fieldLabel: string;
    element: HTMLElement;
    subOfferIndex?: number;
}

// --- START: Keyboard Shortcut System Interfaces & State ---
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: 'General' | 'Editing' | 'Navigation' | 'Components';
  action: (event: KeyboardEvent) => void;
  condition?: () => boolean;
}

interface CommandHistoryState {
  designSettings: DesignSettings;
  activeComponents: EmailComponent[];
  timestamp: number;
}

let commandHistory: CommandHistoryState[] = [];
let commandHistoryIndex: number = -1;
const MAX_HISTORY_SIZE = 50;

let selectedComponentId: string | null = null;
let shortcuts: KeyboardShortcut[] = [];
// --- END: Keyboard Shortcut System Interfaces & State ---

const CONTENT_KEYS: Record<string, string[]> = {
    header:        ['text'],
    text_block:    ['text'],
    disclaimers:   ['text'],
    button:        ['text', 'link'],
    image:         ['src', 'alt', 'link'],
    divider:       [],
    spacer:        [],
    service_offer: [
        'imageUrl', 'imageAlt', 'imageLink',
        'serviceTitle', 'couponCode', 'serviceDetails', 'disclaimer',
        'buttonText', 'buttonLink',
        'imageUrl2', 'imageAlt2', 'imageLink2',
        'serviceTitle2', 'couponCode2', 'serviceDetails2', 'disclaimer2',
        'buttonText2', 'buttonLink2',
    ],
    sales_offer: [
        'imageSrc', 'imageLink', 'imageWidth',
        'vehicleText', 'mainOfferText', 'detailsText',
        'vinValue', 'stockValue', 'mileageValue',
        'disclaimerText', 'additionalOffers', 'btnText', 'btnLink',
        'imageSrc2', 'imageLink2', 'imageWidth2',
        'vehicleText2', 'mainOfferText2', 'detailsText2',
        'vinValue2', 'stockValue2', 'mileageValue2',
        'disclaimerText2', 'additionalOffers2', 'btnText2', 'btnLink2',
    ],
    footer: ['links'],
};
const STRUCTURAL_KEYS = ['layout', 'textLayout'];

const MERGE_FIELDS: MergeFieldGroup[] = [
  {
    title: "Recipient Details",
    items: [
      { label: "First Name", value: "{{recipient.first_name}}" },
      { label: "Last Name", value: "{{recipient.last_name}}" },
      { label: "Email", value: "{{recipient.email}}" }
    ]
  },
  {
    title: "Last Transaction Vehicle",
    items: [
      { label: "Equity State", value: "{{customer.last_transaction.vehicle.equity_payout_formatted}}" },
      { label: "Year", value: "{{customer.last_transaction.vehicle.year}}" },
      { label: "Make", value: "{{customer.last_transaction.vehicle.make}}" },
      { label: "Model", value: "{{customer.last_transaction.vehicle.model}}" },
      { label: "Trim", value: "{{customer.last_transaction.vehicle.trim}}" },
      { label: "VIN", value: "{{customer.last_transaction.vehicle.vin}}" },
      { label: "Mileage", value: "{{customer.last_transaction.vehicle.mileage}}" }
    ]
  },
  {
    title: "Trade-in Estimates",
    items: [
      { label: "Fair Condition", value: "{{customer.owned_vehicle.estimated_trade_in_fair_formatted}}" },
      { label: "Good Condition", value: "{{customer.owned_vehicle.estimated_trade_in_good_formatted}}" },
      { label: "Very Good Condition", value: "{{customer.owned_vehicle.estimated_trade_in_very_good_formatted}}" },
      { label: "Excellent Condition", value: "{{customer.owned_vehicle.estimated_trade_in_excellent_formatted}}" }
    ]
  },
  {
    title: "Recall Details",
    items: [
      { label: "Recall ID", value: "{{customer.last_sold_vehicle.recall_campaign_number}}" },
      { label: "Recall Description", value: "{{customer.last_sold_vehicle.recall_description}}" }
    ]
  },
  {
    title: "Dealer Details",
    items: [
      { label: "Dealership Name", value: "{{dealership.name}}" },
      { label: "Dealership Phone", value: "{{dealership.phone_number}}" },
      { label: "Dealership Address", value: "{{dealership.address}}" },
      { label: "Sales Rep Name", value: "{{dealership.sales.representative.name}}" },
      { label: "Sales Rep Title", value: "{{dealership.sales.representative.title}}" }
    ]
  },
  {
    title: "Website Links",
    subgroups: [
      {
        title: "Homepage",
        items: [
          { label: "Homepage URL (LP)", value: "{{dealership.tracked_website_homepage_url}}" },
          { label: "Homepage URL (No LP)", value: "{{dealership.tracked_website_homepage_no_lp_url}}" }
        ]
      },
      {
        title: "Specials",
        items: [
          { label: "Specials Page (LP)", value: "{{dealership.tracked_website_specials_url}}" },
          { label: "Specials Page (No LP)", value: "{{dealership.tracked_website_specials_no_lp_url}}" }
        ]
      },
      {
        title: "Trade-In",
        items: [
          { label: "Trade-In Value (LP)", value: "{{dealership.tracked_website_vehicle_acquisition_url}}" },
          { label: "Trade-In Value (No LP)", value: "{{dealership.tracked_website_vehicle_acquisition_no_lp_url}}" }
        ]
      },
      {
        title: "Service",
        items: [
          { label: "Service Page (LP)", value: "{{dealership.tracked_website_service_url}}" },
          { label: "Service Page (No LP)", value: "{{dealership.tracked_website_service_no_lp_url}}" },
          { label: "Service Specials (LP)", value: "{{dealership.tracked_website_service_specials_url}}" },
          { label: "Service Specials (No LP)", value: "{{dealership.tracked_website_service_specials_no_lp_url}}" },
          { label: "Service Scheduler (LP)", value: "{{dealership.tracked_website_service_scheduler_url}}" },
          { label: "Service Scheduler (No LP)", value: "{{dealership.tracked_website_service_scheduler_no_lp_url}}" },
          { label: "Service Reviews (LP)", value: "{{dealership.tracked_website_service_customer_reviews_url}}" },
          { label: "Service Reviews (No LP)", value: "{{dealership.tracked_website_service_customer_reviews_no_lp_url}}" }
        ]
      },
      {
        title: "Other Pages",
        items: [
          { label: "Accessories (LP)", value: "{{dealership.tracked_website_accessories_url}}" },
          { label: "Accessories (No LP)", value: "{{dealership.tracked_website_accessories_no_lp_url}}" },
          { label: "Body Shop (LP)", value: "{{dealership.tracked_website_body_shop_url}}" },
          { label: "Body Shop (No LP)", value: "{{dealership.tracked_website_body_shop_no_lp_url}}" },
          { label: "Parts Page (LP)", value: "{{dealership.tracked_website_parts_url}}" },
          { label: "Parts Page (No LP)", value: "{{dealership.tracked_website_parts_no_lp_url}}" },
          { label: "Tires Page (LP)", value: "{{dealership.tracked_website_tires_url}}" },
          { label: "Tires Page (No LP)", value: "{{dealership.tracked_website_tires_no_lp_url}}" }
        ]
      }
    ]
  }
];

interface FlatMergeFieldItem {
  label: string;
  value: string;
  group: string;
  subgroup?: string;
  searchText: string;
}

const FLAT_MERGE_FIELDS: FlatMergeFieldItem[] = (() => {
  const result: FlatMergeFieldItem[] = [];
  MERGE_FIELDS.forEach(group => {
    if (group.items) {
      group.items.forEach(item => {
        result.push({
          label: item.label,
          value: item.value,
          group: group.title,
          searchText: `${item.label} ${item.value}`.toLowerCase()
        });
      });
    }
    if (group.subgroups) {
      group.subgroups.forEach(sub => {
        sub.items.forEach(item => {
          result.push({
            label: item.label,
            value: item.value,
            group: group.title,
            subgroup: sub.title,
            searchText: `${item.label} ${item.value}`.toLowerCase()
          });
        });
      });
    }
  });
  return result;
})();

// Application State
let designSettings: DesignSettings = {
  fontFamily: "'Arial', sans-serif",
  buttonStyle: 'rounded',
  offersLayout: 'list',
  globalBodyColor: '#1d1d1f',
  globalLinkColor: '#007aff',
  globalFontSize: '14',
  colorScheme: 'classic'
};

let activeComponents: EmailComponent[] = [];
let activeField: ActiveField | null = null;
let collapsedStates: Record<string, boolean> = {};
let draggedComponentId: string | null = null;
let activeTemplateId: string | null = null;

// DOM Elements
const emailForm = document.getElementById('email-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const outputContainer = document.getElementById('output-container') as HTMLElement;
const outputPlaceholder = document.getElementById('output-placeholder') as HTMLElement;
const previewPane = document.getElementById('preview-pane') as HTMLIFrameElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const downloadPdfBtn = document.getElementById('download-pdf-btn') as HTMLButtonElement;
const htmlSizeIndicator = document.getElementById('html-size-indicator');
const componentsContainer = document.getElementById('form-components-container') as HTMLElement;
const addComponentBtn = document.getElementById('add-component-btn') as HTMLButtonElement;

// Sidebar & Picker elements
const designSidebar = document.getElementById('design-sidebar');
const dynamicStylingContainer = document.getElementById('dynamic-styling-container');
const mergeFieldsSidebar = document.getElementById('merge-fields-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const designSidebarOverlay = document.getElementById('design-sidebar-overlay');
const componentPickerOverlay = document.getElementById('component-picker-overlay');
const closeComponentPicker = document.getElementById('close-component-picker');

// Toggle buttons
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const collapseAllBtn = document.getElementById('collapse-all-btn');
const expandAllBtn = document.getElementById('expand-all-btn');
const floatingMergeBtn = document.getElementById('floating-merge-btn');

// Bulk action buttons
const deleteAllBtn = document.getElementById('delete-all-btn');
const resetAllBtn = document.getElementById('reset-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// View Toggles
const desktopViewBtn = document.getElementById('desktop-view-btn');
const mobileViewBtn = document.getElementById('mobile-view-btn');

// Close buttons
const closeDesignSidebar = document.getElementById('close-design-sidebar');
const closeMergeSidebar = document.getElementById('close-sidebar');

// Right Panel Elements
const rightPanel = document.getElementById('right-panel');
const rightPanelOverlay = document.getElementById('right-panel-overlay');
const closeRightPanel = document.getElementById('close-right-panel');
const floatingPanelBtn = document.getElementById('floating-panel-btn');

// Design Settings Controls
const fontSelect = document.getElementById('design-font-family') as HTMLSelectElement;
const preheaderInput = document.getElementById('design-preheader-text') as HTMLInputElement;
const preheaderCharCount = document.getElementById('preheader-char-count');
const preheaderCharHint = document.getElementById('preheader-char-hint');

// Saved Template Elements
const saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
const savedTemplatesList = document.getElementById('saved-templates-list') as HTMLElement;
const componentLibraryList = document.getElementById('component-library-list') as HTMLElement;
const libraryFilterBar = document.getElementById('library-filter-bar') as HTMLElement;
let activeLibraryFilter = 'all';

// Template search / filter / sort state
let templateSearchQuery = '';
let templateStatusFilter: TemplateStatus | 'all' = 'all';
let templateSortBy: 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'status' = 'date-desc';

const ALIGNMENT_ICONS = {
    left: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>`,
    center: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="7" y2="18"></line></svg>`,
    right: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>`
};

// Toast Notification
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', onUndo?: () => void) => {
    let toastWrapper = document.getElementById('toast-wrapper');
    if (!toastWrapper) {
        toastWrapper = document.createElement('div');
        toastWrapper.id = 'toast-wrapper';
        toastWrapper.className = 'toast-wrapper';
        document.body.appendChild(toastWrapper);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}${onUndo ? ' toast--undoable' : ''}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const icons = {
        success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        info: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    toast.innerHTML = `
        ${icons[type]}
        <span>${message}</span>
        ${onUndo ? '<button class="toast-undo-btn">Undo</button>' : ''}
    `;

    toastWrapper.appendChild(toast);

    if (onUndo) {
        const undoBtn = toast.querySelector('.toast-undo-btn') as HTMLButtonElement;
        undoBtn.addEventListener('click', () => {
            onUndo();
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
                if (toastWrapper && !toastWrapper.hasChildNodes()) {
                    toastWrapper.remove();
                }
            }, { once: true });
        });
    }

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const dismissDelay = onUndo ? 5000 : 3000;
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            if (toastWrapper && !toastWrapper.hasChildNodes()) {
                toastWrapper.remove();
            }
        }, { once: true });
    }, dismissDelay);
}


// --- Tooltip System (JS-positioned, immune to overflow:hidden) ---
const tooltipEl = document.createElement('div');
tooltipEl.className = 'tooltip-popup';
document.body.appendChild(tooltipEl);
let tooltipTimeout: number;

document.addEventListener('mouseover', (e) => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
    if (!target) return;

    const text = target.getAttribute('data-tooltip');
    if (!text) return;

    tooltipEl.textContent = text;

    const rect = target.getBoundingClientRect();
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.top - 6}px`;

    window.clearTimeout(tooltipTimeout);
    tooltipTimeout = window.setTimeout(() => {
        tooltipEl.classList.add('visible');
    }, 10);
});

document.addEventListener('mouseout', (e) => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
    if (!target) return;

    window.clearTimeout(tooltipTimeout);
    tooltipEl.classList.remove('visible');
});


// Local Storage Keys
const LS_TEMPLATES_KEY = 'craftor_saved_templates';
const LS_DRAFT_KEY = 'craftor_current_draft';
const LS_COLLAPSED_KEY = 'craftor_component_states';
const LS_LIBRARY_KEY = 'craftor_component_library';
const LS_DEALERSHIPS_KEY = 'craftor_dealership_groups';
const LS_ACTIVE_DEALERSHIP_KEY = 'craftor_active_dealership';

// Active dealership group
let activeDealershipId: string | null = null;


const loadCollapsedStates = () => {
    try {
        const data = localStorage.getItem(LS_COLLAPSED_KEY);
        collapsedStates = data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Failed to load component states", e);
        collapsedStates = {};
    }
};

const saveCollapsedStates = () => {
    localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(collapsedStates));
};

collapseAllBtn?.addEventListener('click', () => {
    activeComponents.forEach(c => { collapsedStates[c.id] = true; });
    saveCollapsedStates();
    renderComponents();
});

expandAllBtn?.addEventListener('click', () => {
    activeComponents.forEach(c => { collapsedStates[c.id] = false; });
    saveCollapsedStates();
    renderComponents();
});

deleteAllBtn?.addEventListener('click', () => {
    if (activeComponents.length === 0) return;
    activeComponents = [];
    selectedComponentId = null;
    collapsedStates = {};
    saveCollapsedStates();
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('All sections deleted', 'success');
});

resetAllBtn?.addEventListener('click', () => {
    if (activeComponents.length === 0) return;
    activeComponents.forEach(comp => {
        const defaults = getDefaultComponentData(comp.type);
        const contentKeys = CONTENT_KEYS[comp.type] || [];
        for (const key of Object.keys(comp.data)) {
            if (contentKeys.includes(key)) continue;
            if (STRUCTURAL_KEYS.includes(key)) continue;
            if (key in defaults) comp.data[key] = defaults[key];
        }
    });
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('All styles reset to defaults', 'success');
});

clearAllBtn?.addEventListener('click', () => {
    if (activeComponents.length === 0) return;
    activeComponents.forEach(comp => {
        const contentKeys = CONTENT_KEYS[comp.type] || [];
        for (const key of contentKeys) {
            if (!(key in comp.data)) continue;
            if (key === 'additionalOffers' || key === 'additionalOffers2' || key === 'links') {
                comp.data[key] = '[]';
            } else {
                comp.data[key] = '';
            }
        }
    });
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('All content cleared', 'success');
});

const toggleComponent = (id: string) => {
    const componentEl = document.querySelector(`.component-item[data-id='${id}']`);
    if (componentEl) {
        const isCollapsed = componentEl.classList.toggle('collapsed');
        collapsedStates[id] = isCollapsed;
        saveCollapsedStates();
    }
};


const truncate = (str: string, maxLength: number): string => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

// HTML size indicator for Gmail clipping warning
const updateHtmlSizeIndicator = (html: string) => {
    if (!htmlSizeIndicator) return;
    const bytes = new TextEncoder().encode(html).length;
    const kb = bytes / 1024;
    const display = `${Math.round(kb)}KB / 102KB`;
    htmlSizeIndicator.textContent = display;
    htmlSizeIndicator.className = 'html-size-indicator';
    if (kb > 95) {
        htmlSizeIndicator.classList.add('size-red');
        htmlSizeIndicator.title = 'Your email may be clipped in Gmail. Consider reducing content or splitting into multiple emails.';
    } else if (kb > 80) {
        htmlSizeIndicator.classList.add('size-yellow');
        htmlSizeIndicator.title = 'Approaching Gmail 102KB clipping limit';
    } else {
        htmlSizeIndicator.classList.add('size-green');
        htmlSizeIndicator.title = 'Gmail clips emails larger than 102KB';
    }
};

// Debounce helper for preview updates
let previewTimer: number;
const triggerPreviewUpdate = () => {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
        if (previewPane) {
            try {
                const html = generateEmailHtml();
                previewPane.srcdoc = html;
                updateHtmlSizeIndicator(html);
            } catch (e) {
                console.error("Preview generation failed:", e);
            }
        }
    }, 300);
};

// Returns the correct draft localStorage key depending on active dealership
const getDraftKey = (dealershipId?: string | null): string => {
    const id = dealershipId !== undefined ? dealershipId : activeDealershipId;
    return id ? `craftor_draft_${id}` : LS_DRAFT_KEY;
};

// Write state to localStorage without side-effects (used by debounced hot path)
const persistDraft = () => {
    try {
        localStorage.setItem(getDraftKey(), JSON.stringify({ designSettings, activeComponents }));
    } catch (e) {
        console.error("Failed to save draft", e);
    }
};

// Full draft save: persists + triggers preview (used by non-keystroke callers)
const saveDraft = () => {
    persistDraft();
    triggerPreviewUpdate();
};

// Debounce timers for the updateComponentData hot path
let draftPersistTimer: number;
let historyDebounceTimer: number;

// Design Customization Logic
fontSelect?.addEventListener('change', () => {
    designSettings.fontFamily = fontSelect.value;
    saveDraft();
    saveToHistory();
    showToast('Font updated', 'success');
});

const updatePreheaderCounter = () => {
    const len = preheaderInput?.value.length ?? 0;
    if (preheaderCharCount) preheaderCharCount.textContent = `${len} / 150`;
    if (preheaderCharHint) {
        if (len === 0) {
            preheaderCharHint.textContent = '';
            preheaderCharHint.style.color = '';
        } else if (len < 35) {
            preheaderCharHint.textContent = 'Too short';
            preheaderCharHint.style.color = 'var(--system-orange, #ff9500)';
        } else if (len <= 90) {
            preheaderCharHint.textContent = 'Good length';
            preheaderCharHint.style.color = 'var(--system-green, #34c759)';
        } else {
            preheaderCharHint.textContent = 'May be truncated';
            preheaderCharHint.style.color = 'var(--system-orange, #ff9500)';
        }
    }
};

preheaderInput?.addEventListener('input', () => {
    designSettings.preheaderText = preheaderInput.value;
    updatePreheaderCounter();
    saveDraft();
});

// View Toggles
desktopViewBtn?.addEventListener('click', () => {
    desktopViewBtn.classList.add('active');
    mobileViewBtn?.classList.remove('active');
    previewPane.className = 'preview-frame desktop';
});

mobileViewBtn?.addEventListener('click', () => {
    mobileViewBtn.classList.add('active');
    desktopViewBtn?.classList.remove('active');
    previewPane.className = 'preview-frame mobile';
});

let lastFocusedInput: HTMLInputElement | HTMLTextAreaElement | null = null;

// --- Autocomplete State ---
let autocompleteDropdown: HTMLElement | null = null;
let autocompleteVisible = false;
let autocompleteSelectedIndex = -1;
let autocompleteFilteredItems: FlatMergeFieldItem[] = [];
let autocompleteTriggerStart = -1;
let autocompleteTargetInput: HTMLInputElement | HTMLTextAreaElement | null = null;

document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement;
  const componentId = target.closest('.component-item')?.getAttribute('data-id');
  if (componentId) {
      selectComponent(componentId);
  }

  if (target.hasAttribute('data-stylable')) {
      if (activeField?.element) {
          activeField.element.classList.remove('field-active');
      }

      const fieldKey = target.dataset.fieldKey;
      const fieldLabel = target.dataset.fieldLabel;
      const subOfferIndex = target.dataset.subOfferIndex ? parseInt(target.dataset.subOfferIndex) : undefined;

      if (componentId && fieldKey && fieldLabel) {
          activeField = {
              componentId,
              fieldKey,
              fieldLabel,
              element: target,
              subOfferIndex
          };
          target.classList.add('field-active');
          renderStylingPanel();
      }
  } else if (componentId && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      // Non-stylable field inside a component — clear panel so it doesn't show stale settings
      if (activeField?.element) {
          activeField.element.classList.remove('field-active');
          activeField = null;
      }
      if (dynamicStylingContainer) dynamicStylingContainer.innerHTML = '';
  }

  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    lastFocusedInput = target as HTMLInputElement | HTMLTextAreaElement;
  }
});

const insertMergeField = (value: string) => {
    if (lastFocusedInput) {
        const start = lastFocusedInput.selectionStart || 0;
        const end = lastFocusedInput.selectionEnd || 0;
        const text = lastFocusedInput.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        lastFocusedInput.value = before + value + after;
        lastFocusedInput.selectionStart = lastFocusedInput.selectionEnd = start + value.length;
        lastFocusedInput.focus();
        
        lastFocusedInput.dispatchEvent(new Event('input', { bubbles: true }));
        showToast(`Inserted: ${value}`, 'success');
        closeSidebarFunc();
    } else {
        showToast('Please click a text field first to insert the merge field.', 'info');
    }
};

// --- Merge Field Autocomplete ---

const filterMergeFields = (query: string): FlatMergeFieldItem[] => {
  if (!query) return FLAT_MERGE_FIELDS;
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return FLAT_MERGE_FIELDS;
  return FLAT_MERGE_FIELDS.filter(item => item.searchText.includes(lowerQuery));
};

const highlightMatch = (text: string, query: string): string => {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) return text;
  const before = text.substring(0, matchIndex);
  const match = text.substring(matchIndex, matchIndex + query.length);
  const after = text.substring(matchIndex + query.length);
  return `${before}<span class="match-highlight">${match}</span>${after}`;
};

const positionAutocomplete = (inputEl: HTMLInputElement | HTMLTextAreaElement) => {
  if (!autocompleteDropdown) return;
  const rect = inputEl.getBoundingClientRect();
  const dropdownHeight = 350;
  const viewportHeight = window.innerHeight;

  let top = rect.bottom + window.scrollY + 4;
  let left = rect.left + window.scrollX;

  if (rect.bottom + dropdownHeight > viewportHeight) {
    top = rect.top + window.scrollY - dropdownHeight - 4;
  }

  const dropdownWidth = 300;
  if (left + dropdownWidth > window.innerWidth) {
    left = window.innerWidth - dropdownWidth - 8;
  }

  autocompleteDropdown.style.top = `${top}px`;
  autocompleteDropdown.style.left = `${left}px`;
};

const renderAutocompleteDropdown = (items: FlatMergeFieldItem[], query: string) => {
  if (!autocompleteDropdown) {
    autocompleteDropdown = document.getElementById('autocomplete-dropdown');
  }
  if (!autocompleteDropdown) return;

  if (items.length === 0) {
    hideAutocomplete();
    return;
  }

  let html = '<div class="autocomplete-list">';
  let currentGroup = '';
  let itemIndex = 0;

  items.forEach((item) => {
    const groupKey = item.subgroup ? `${item.group} \u203A ${item.subgroup}` : item.group;
    if (groupKey !== currentGroup) {
      currentGroup = groupKey;
      html += `<div class="autocomplete-group-header">${groupKey}</div>`;
    }

    const highlightedLabel = highlightMatch(item.label, query);
    const selectedClass = itemIndex === autocompleteSelectedIndex ? ' selected' : '';

    html += `<div class="autocomplete-item${selectedClass}" data-index="${itemIndex}">
      <span class="autocomplete-item-name">${highlightedLabel}</span>
    </div>`;
    itemIndex++;
  });

  html += '</div>';
  html += `<div class="autocomplete-footer">
    <span><kbd>\u2191</kbd><kbd>\u2193</kbd> navigate</span>
    <span><kbd>Enter</kbd> select</span>
    <span><kbd>Esc</kbd> close</span>
  </div>`;

  autocompleteDropdown.innerHTML = html;

  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const idx = parseInt((el as HTMLElement).dataset.index || '0');
      selectAutocompleteItem(idx);
    });
  });
};

const showAutocomplete = (inputEl: HTMLInputElement | HTMLTextAreaElement) => {
  if (!autocompleteDropdown) {
    autocompleteDropdown = document.getElementById('autocomplete-dropdown');
  }
  if (!autocompleteDropdown) return;
  autocompleteTargetInput = inputEl;
  positionAutocomplete(inputEl);
  autocompleteDropdown.classList.add('visible');
  autocompleteVisible = true;
};

const hideAutocomplete = () => {
  if (!autocompleteDropdown) return;
  autocompleteDropdown.classList.remove('visible');
  autocompleteVisible = false;
  autocompleteSelectedIndex = -1;
  autocompleteTriggerStart = -1;
  autocompleteTargetInput = null;
  autocompleteFilteredItems = [];
};

const selectAutocompleteItem = (index: number) => {
  const item = autocompleteFilteredItems[index];
  if (!item || !autocompleteTargetInput) return;
  if (!document.contains(autocompleteTargetInput)) {
    hideAutocomplete();
    return;
  }

  const input = autocompleteTargetInput;
  const text = input.value;
  const cursorPos = input.selectionStart || 0;

  const before = text.substring(0, autocompleteTriggerStart);
  const after = text.substring(cursorPos);

  input.value = before + item.value + after;

  const newCursorPos = autocompleteTriggerStart + item.value.length;
  input.selectionStart = input.selectionEnd = newCursorPos;
  input.focus();

  input.dispatchEvent(new Event('input', { bubbles: true }));
  hideAutocomplete();
};

const updateAutocompleteSelection = () => {
  if (!autocompleteDropdown) return;
  const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  items.forEach((el, i) => {
    el.classList.toggle('selected', i === autocompleteSelectedIndex);
  });
  const selectedEl = items[autocompleteSelectedIndex] as HTMLElement;
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
};

// Autocomplete: detect '{{' trigger on input (debounced to avoid running on every keystroke)
let autocompleteInputTimer: number;
document.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;

  window.clearTimeout(autocompleteInputTimer);
  autocompleteInputTimer = window.setTimeout(() => {
    const input = target as HTMLInputElement | HTMLTextAreaElement;
    const cursorPos = input.selectionStart;
    if (cursorPos === null) return;

    const text = input.value;
    const textBeforeCursor = text.substring(0, cursorPos);

    const lastTrigger = textBeforeCursor.lastIndexOf('{{');

    if (lastTrigger === -1) {
      if (autocompleteVisible) hideAutocomplete();
      return;
    }

    const textAfterTrigger = textBeforeCursor.substring(lastTrigger);
    if (textAfterTrigger.includes('}}')) {
      if (autocompleteVisible) hideAutocomplete();
      return;
    }

    const query = textBeforeCursor.substring(lastTrigger + 2);

    autocompleteTriggerStart = lastTrigger;
    autocompleteFilteredItems = filterMergeFields(query);
    autocompleteSelectedIndex = 0;

    if (autocompleteFilteredItems.length > 0) {
      renderAutocompleteDropdown(autocompleteFilteredItems, query);
      showAutocomplete(input);
    } else {
      hideAutocomplete();
    }
  }, 50);
});

// Autocomplete: keyboard navigation (capture phase to intercept before global handler)
document.addEventListener('keydown', (e) => {
  if (!autocompleteVisible) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      e.stopPropagation();
      autocompleteSelectedIndex = (autocompleteSelectedIndex + 1) % autocompleteFilteredItems.length;
      updateAutocompleteSelection();
      break;

    case 'ArrowUp':
      e.preventDefault();
      e.stopPropagation();
      autocompleteSelectedIndex = (autocompleteSelectedIndex - 1 + autocompleteFilteredItems.length) % autocompleteFilteredItems.length;
      updateAutocompleteSelection();
      break;

    case 'Enter':
      e.preventDefault();
      e.stopPropagation();
      if (autocompleteSelectedIndex >= 0) {
        selectAutocompleteItem(autocompleteSelectedIndex);
      }
      break;

    case 'Escape':
      e.preventDefault();
      e.stopPropagation();
      hideAutocomplete();
      break;

    case 'Tab':
      hideAutocomplete();
      break;
  }
}, true);

// Autocomplete: close on outside click
document.addEventListener('mousedown', (e) => {
  if (!autocompleteVisible) return;
  if (!autocompleteDropdown) return;

  const target = e.target as HTMLElement;
  if (autocompleteDropdown.contains(target)) return;
  if (target === autocompleteTargetInput) return;

  hideAutocomplete();
});

// Autocomplete: close on blur (with delay to allow dropdown mousedown)
document.addEventListener('focusout', (e) => {
  if (!autocompleteVisible) return;
  const target = e.target as HTMLElement;
  if (target !== autocompleteTargetInput) return;

  setTimeout(() => {
    const activeEl = document.activeElement;
    if (activeEl !== autocompleteTargetInput) {
      hideAutocomplete();
    }
  }, 150);
});

// Autocomplete: reposition on scroll/resize
window.addEventListener('scroll', () => {
  if (autocompleteVisible && autocompleteTargetInput) {
    positionAutocomplete(autocompleteTargetInput);
  }
}, true);

window.addEventListener('resize', () => {
  if (autocompleteVisible && autocompleteTargetInput) {
    positionAutocomplete(autocompleteTargetInput);
  }
});

const renderMergeFieldsSidebar = () => {
    if (!mergeFieldsSidebar) return;
    const contentContainer = mergeFieldsSidebar.querySelector('.sidebar-content');
    if (!contentContainer) return;
    
    contentContainer.innerHTML = '';

    MERGE_FIELDS.forEach(group => {
        const details = document.createElement('details');
        details.className = 'sidebar-group';
        details.setAttribute('open', '');
        
        const summary = document.createElement('summary');
        summary.textContent = group.title;
        details.appendChild(summary);

        const content = document.createElement('div');
        content.className = 'sidebar-group-content';

        const createItemEl = (item: MergeFieldItem) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'merge-field-item';
            itemEl.innerHTML = `<span style="font-weight: 500;">${item.label}</span>`;
            itemEl.addEventListener('click', () => insertMergeField(item.value));
            return itemEl;
        };

        if (group.items) group.items.forEach(item => content.appendChild(createItemEl(item)));
        if (group.subgroups) {
            group.subgroups.forEach(sub => {
                const subHeader = document.createElement('div');
                subHeader.style.cssText = 'font-size: 9px; font-weight: 700; color: var(--label-tertiary); margin-top: var(--spacing-sm); margin-bottom: var(--spacing-xs); text-transform: uppercase; letter-spacing: 0.05em;';
                subHeader.textContent = sub.title;
                content.appendChild(subHeader);
                sub.items.forEach(item => content.appendChild(createItemEl(item)));
            });
        }
        details.appendChild(content);
        contentContainer.appendChild(details);
    });
};

// Sidebar Controls
const openDesignSidebar = () => {
    designSidebar?.classList.add('open');
    designSidebarOverlay?.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

const closeDesignSidebarFunc = () => {
    designSidebar?.classList.remove('open');
    designSidebarOverlay?.classList.remove('visible');
    document.body.style.overflow = '';
}

const closeSidebarFunc = () => {
  mergeFieldsSidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
};

const closeComponentPickerFunc = () => {
    componentPickerOverlay?.classList.remove('visible');
};

addComponentBtn?.addEventListener('click', () => {
    componentPickerOverlay?.classList.add('visible');
});

closeComponentPicker?.addEventListener('click', closeComponentPickerFunc);
componentPickerOverlay?.addEventListener('click', (e) => {
    if (e.target === componentPickerOverlay) closeComponentPickerFunc();
});

const pickerOptions = document.querySelectorAll('.picker-option');
pickerOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    const type = opt.getAttribute('data-type');
    if (type) {
      addNewComponent(type);
      closeComponentPickerFunc();
    }
  });
});

mobileMenuToggle?.addEventListener('click', openDesignSidebar);
closeDesignSidebar?.addEventListener('click', closeDesignSidebarFunc);
designSidebarOverlay?.addEventListener('click', closeDesignSidebarFunc);

closeMergeSidebar?.addEventListener('click', closeSidebarFunc);
sidebarOverlay?.addEventListener('click', closeSidebarFunc);


floatingMergeBtn?.addEventListener('click', () => {
  mergeFieldsSidebar?.classList.add('open');
  sidebarOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
});

// Right Panel: toggle, close, tab switching
const openRightPanel = () => {
  rightPanel?.classList.add('open');
  rightPanelOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
};
const closeRightPanelFunc = () => {
  rightPanel?.classList.remove('open');
  rightPanelOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
};

floatingPanelBtn?.addEventListener('click', openRightPanel);
closeRightPanel?.addEventListener('click', closeRightPanelFunc);
rightPanelOverlay?.addEventListener('click', closeRightPanelFunc);

// Tab switching inside right panel
document.querySelectorAll('.right-panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');
    document.querySelectorAll('.right-panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.right-panel-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    const targetContent = document.getElementById(`right-panel-${targetTab}`);
    targetContent?.classList.add('active');
  });
});

// Quick-add component buttons in card header
document.querySelectorAll('.quickadd-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-type');
    if (type) {
      addNewComponent(type);
    }
  });
});

const getDefaultComponentData = (type: string): Record<string, string> => {
    switch (type) {
        case 'header':
            return {
                text: '',
                fontSize: designSettings.globalFontSize || '18',
                textColor: designSettings.globalBodyColor || '#1d1d1f',
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                paddingTop: '15',
                paddingBottom: '15',
                paddingLeftRight: '15',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'text_block':
            return {
                text: '',
                fontSize: designSettings.globalFontSize || '12',
                textColor: designSettings.globalBodyColor || '#3c3c43',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'left',
                paddingTop: '8',
                paddingBottom: '8',
                paddingLeftRight: '15',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'image':
            return {
                src: '',
                alt: '',
                link: '',
                width: '100%',
                align: 'center',
                paddingTop: '0',
                paddingBottom: '0',
                paddingLeftRight: '0',
                backgroundColor: 'transparent',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'button':
            return {
                text: '',
                link: '',
                fontSize: '12',
                textColor: '#ffffff',
                backgroundColor: designSettings.globalLinkColor || '#007aff',
                align: 'center',
                paddingTop: '9',
                paddingBottom: '9',
                paddingLeftRight: '15',
                widthType: 'auto',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'divider':
            return {
                width: '100',
                thickness: '1',
                lineColor: '#CCCCCC',
                alignment: 'center',
                paddingTop: '12',
                paddingBottom: '12',
                paddingLeftRight: '0',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'spacer':
            return {
                height: '30',
                backgroundColor: 'transparent',
                matchEmailBackground: 'true',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'disclaimers':
            return {
                text: '',
                fontSize: '9',
                textColor: '#86868b',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                paddingTop: '12',
                paddingBottom: '12',
                paddingLeftRight: '15',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        case 'service_offer':
            return {
                layout: 'center',
                imageUrl: '', imageAlt: '', imageLink: '',
                serviceTitle: '', couponCode: '',
                serviceDetails: '',
                disclaimer: '',
                buttonText: '', buttonLink: '',
                imageUrl2: '', imageAlt2: '', imageLink2: '',
                serviceTitle2: '', couponCode2: '',
                serviceDetails2: '',
                disclaimer2: '',
                buttonText2: '', buttonLink2: '',
                containerPaddingTop: '15', containerPaddingBottom: '15', containerPaddingLeft: '15', containerPaddingRight: '15',
                imageWidth: '100', imageAlignment: 'center', imagePaddingTop: '8', imagePaddingBottom: '8',
                titleFontSize: '18', titleFontWeight: 'bold', titleFontStyle: 'normal', titleTextColor: '#000000', titleBgColor: 'transparent', titleAlignment: 'center', titlePaddingTop: '8', titlePaddingBottom: '8', titlePaddingLeftRight: '0',
                couponFontSize: '15', couponFontWeight: 'bold', couponFontStyle: 'normal', couponTextColor: '#0066FF', couponBgColor: '#F0F7FF', couponAlignment: 'center', couponPaddingTop: '6', couponPaddingBottom: '6', couponPaddingLeftRight: '12', couponShowBorder: 'false', couponBorderStyle: 'dashed', couponBorderColor: '#0066FF',
                detailsFontSize: '12', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsTextColor: '#333333', detailsBgColor: 'transparent', detailsAlignment: 'center', detailsLineHeight: '1.5', detailsPaddingTop: '9', detailsPaddingBottom: '9', detailsPaddingLeftRight: '0',
                disclaimerFontSize: '9', disclaimerFontWeight: 'normal', disclaimerFontStyle: 'normal', disclaimerTextColor: '#666666', disclaimerBgColor: 'transparent', disclaimerAlignment: 'center', disclaimerPaddingTop: '6', disclaimerPaddingBottom: '6', disclaimerPaddingLeftRight: '0',
                buttonFontSize: '12', buttonFontWeight: 'bold', buttonAlignment: 'center', buttonBgColor: '#0066FF', buttonTextColor: '#FFFFFF', buttonPaddingTop: '9', buttonPaddingBottom: '9', buttonPaddingLeftRight: '15', buttonWidth: 'auto', buttonBorderRadius: '8', buttonBorderColor: '', buttonBorderWidth: '0',
                imageWidth2: '100', imageAlignment2: 'center', imagePaddingTop2: '8', imagePaddingBottom2: '8',
                titleFontSize2: '18', titleFontWeight2: 'bold', titleFontStyle2: 'normal', titleTextColor2: '#000000', titleBgColor2: 'transparent', titleAlignment2: 'center', titlePaddingTop2: '8', titlePaddingBottom2: '8', titlePaddingLeftRight2: '0',
                couponFontSize2: '15', couponFontWeight2: 'bold', couponFontStyle2: 'normal', couponTextColor2: '#0066FF', couponBgColor2: '#F0F7FF', couponAlignment2: 'center', couponPaddingTop2: '6', couponPaddingBottom2: '6', couponPaddingLeftRight2: '12', couponShowBorder2: 'false', couponBorderStyle2: 'dashed', couponBorderColor2: '#0066FF',
                detailsFontSize2: '12', detailsFontWeight2: 'normal', detailsFontStyle2: 'normal', detailsTextColor2: '#333333', detailsBgColor2: 'transparent', detailsAlignment2: 'center', detailsLineHeight2: '1.5', detailsPaddingTop2: '9', detailsPaddingBottom2: '9', detailsPaddingLeftRight2: '0',
                disclaimerFontSize2: '9', disclaimerFontWeight2: 'normal', disclaimerFontStyle2: 'normal', disclaimerTextColor2: '#666666', disclaimerBgColor2: 'transparent', disclaimerAlignment2: 'center', disclaimerPaddingTop2: '6', disclaimerPaddingBottom2: '6', disclaimerPaddingLeftRight2: '0',
                buttonFontSize2: '12', buttonFontWeight2: 'bold', buttonAlignment2: 'center', buttonBgColor2: '#0066FF', buttonTextColor2: '#FFFFFF', buttonPaddingTop2: '9', buttonPaddingBottom2: '9', buttonPaddingLeftRight2: '15', buttonWidth2: 'auto', buttonBorderRadius2: '8', buttonBorderColor2: '', buttonBorderWidth2: '0',
                textLayout: 'center',
                showBorder: 'true',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: '',
                mobileReverse: 'false'
            };
        case 'sales_offer':
            return {
                layout: 'center',
                imageSrc: '', imageLink: '', imageWidth: '100%',
                vehicleText: '',
                mainOfferText: '',
                detailsText: '',
                vinValue: '', stockValue: '',
                mileageValue: '',
                disclaimerText: '',
                additionalOffers: '[]', btnText: '', btnLink: '',
                imageSrc2: '', imageLink2: '', imageWidth2: '100%',
                vehicleText2: '', mainOfferText2: '',
                detailsText2: '',
                vinValue2: '', stockValue2: '', mileageValue2: '',
                disclaimerText2: '',
                additionalOffers2: '[]', btnText2: '', btnLink2: '',
                vehicleFontSize: '18', vehicleFontWeight: 'normal', vehicleFontStyle: 'normal', vehicleColor: '#1d1d1f', vehicleBgColor: 'transparent', vehicleTextAlign: 'center', vehiclePaddingTop: '0', vehiclePaddingBottom: '6', vehiclePaddingLeftRight: '0',
                mainOfferFontSize: '21', mainOfferFontWeight: 'normal', mainOfferFontStyle: 'normal', mainOfferColor: '#007aff', mainOfferBgColor: 'transparent', mainOfferTextAlign: 'center', mainOfferPaddingTop: '0', mainOfferPaddingBottom: '6', mainOfferPaddingLeftRight: '0',
                detailsFontSize: '12', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsColor: '#6e6e73', detailsBgColor: 'transparent', detailsTextAlign: 'center', detailsPaddingTop: '0', detailsPaddingBottom: '9', detailsPaddingLeftRight: '0',
                stockVinFontSize: '12', stockVinFontWeight: 'normal', stockVinFontStyle: 'normal', stockVinColor: '#86868b', stockVinBgColor: 'transparent', stockVinTextAlign: 'center', stockVinPaddingTop: '8', stockVinPaddingBottom: '0', stockVinPaddingLeftRight: '0',
                mileageFontSize: '12', mileageFontWeight: 'normal', mileageFontStyle: 'normal', mileageColor: '#86868b', mileageBgColor: 'transparent', mileageTextAlign: 'center', mileagePaddingTop: '3', mileagePaddingBottom: '0', mileagePaddingLeftRight: '0',
                disclaimerFontSize: '9', disclaimerFontWeight: 'normal', disclaimerFontStyle: 'normal', disclaimerColor: '#86868b', disclaimerBgColor: 'transparent', disclaimerTextAlign: 'center', disclaimerPaddingTop: '12', disclaimerPaddingBottom: '0', disclaimerPaddingLeftRight: '0',
                btnFontSize: '12', btnFontWeight: 'bold', btnPaddingTop: '9', btnPaddingBottom: '9', btnPaddingLeftRight: '15', btnColor: '#007aff', btnTextColor: '#ffffff', btnAlign: 'center', btnWidthType: 'full', btnBorderRadius: '8', btnBorderColor: '', btnBorderWidth: '0',
                vehicleFontSize2: '18', vehicleFontWeight2: 'normal', vehicleFontStyle2: 'normal', vehicleColor2: '#1d1d1f', vehicleBgColor2: 'transparent', vehicleTextAlign2: 'center', vehiclePaddingTop2: '0', vehiclePaddingBottom2: '6', vehiclePaddingLeftRight2: '0',
                mainOfferFontSize2: '21', mainOfferFontWeight2: 'normal', mainOfferFontStyle2: 'normal', mainOfferColor2: '#007aff', mainOfferBgColor2: 'transparent', mainOfferTextAlign2: 'center', mainOfferPaddingTop2: '0', mainOfferPaddingBottom2: '6', mainOfferPaddingLeftRight2: '0',
                detailsFontSize2: '12', detailsFontWeight2: 'normal', detailsFontStyle2: 'normal', detailsColor2: '#6e6e73', detailsBgColor2: 'transparent', detailsTextAlign2: 'center', detailsPaddingTop2: '0', detailsPaddingBottom2: '9', detailsPaddingLeftRight2: '0',
                stockVinFontSize2: '12', stockVinFontWeight2: 'normal', stockVinFontStyle2: 'normal', stockVinColor2: '#86868b', stockVinBgColor2: 'transparent', stockVinTextAlign2: 'center', stockVinPaddingTop2: '8', stockVinPaddingBottom2: '0', stockVinPaddingLeftRight2: '0',
                mileageFontSize2: '12', mileageFontWeight2: 'normal', mileageFontStyle2: 'normal', mileageColor2: '#86868b', mileageBgColor2: 'transparent', mileageTextAlign2: 'center', mileagePaddingTop2: '3', mileagePaddingBottom2: '0', mileagePaddingLeftRight2: '0',
                disclaimerFontSize2: '9', disclaimerFontWeight2: 'normal', disclaimerFontStyle2: 'normal', disclaimerColor2: '#86868b', disclaimerBgColor2: 'transparent', disclaimerTextAlign2: 'center', disclaimerPaddingTop2: '12', disclaimerPaddingBottom2: '0', disclaimerPaddingLeftRight2: '0',
                btnFontSize2: '12', btnFontWeight2: 'bold', btnPaddingTop2: '9', btnPaddingBottom2: '9', btnPaddingLeftRight2: '15', btnColor2: '#007aff', btnTextColor2: '#ffffff', btnAlign2: 'center', btnWidthType2: 'full', btnBorderRadius2: '8', btnBorderColor2: '', btnBorderWidth2: '0',
                paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15', backgroundColor: '#ffffff',
                textLayout: 'center',
                showBorder: 'true',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: '',
                mobileReverse: 'false'
            };
        case 'footer':
            return {
                layout: 'inline',
                links: '[]',
                fontSize: '12',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                textColor: designSettings.globalLinkColor || '#007aff',
                backgroundColor: 'transparent',
                separatorColor: '#c7c7cc',
                separatorStyle: 'dot',
                paddingTop: '15',
                paddingBottom: '15',
                paddingLeftRight: '15',
                linkSpacing: '12',
                mobileHide: 'false', mobileFontSize: '', mobileAlignment: '', mobilePadding: ''
            };
        default:
            return {};
    }
};

const resetComponentStyles = (id: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (!comp) return;

    const defaults = getDefaultComponentData(comp.type);
    const contentKeys = CONTENT_KEYS[comp.type] || [];

    for (const key of Object.keys(comp.data)) {
        if (contentKeys.includes(key)) continue;
        if (STRUCTURAL_KEYS.includes(key)) continue;
        if (key in defaults) {
            comp.data[key] = defaults[key];
        }
    }

    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Styles reset to defaults', 'success');
};

const clearComponentContent = (id: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (!comp) return;

    const contentKeys = CONTENT_KEYS[comp.type] || [];
    if (contentKeys.length === 0) return;

    for (const key of contentKeys) {
        if (!(key in comp.data)) continue;

        if (key === 'additionalOffers' || key === 'additionalOffers2' || key === 'links') {
            comp.data[key] = '[]';
        } else {
            comp.data[key] = '';
        }
    }

    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Content cleared', 'success');
};

const addNewComponent = (type: string) => {
    const id = Date.now().toString();
    const data = getDefaultComponentData(type);

    activeComponents.push({ id, type, data });
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`${type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1)} added`, 'success');

    setTimeout(() => {
        const newElement = document.querySelector(`.component-item[data-id='${id}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newElement.classList.add('highlight-pulse');
            setTimeout(() => newElement.classList.remove('highlight-pulse'), 1000);
        }
    }, 100);
};

const removeComponent = (id: string) => {
    const removedIndex = activeComponents.findIndex(c => c.id === id);
    const removedComponent = removedIndex !== -1 ? JSON.parse(JSON.stringify(activeComponents[removedIndex])) as EmailComponent : null;

    activeComponents = activeComponents.filter(c => c.id !== id);
    if (selectedComponentId === id) {
        selectedComponentId = null;
    }
    delete collapsedStates[id];
    saveCollapsedStates();
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Section removed', 'success', removedComponent ? () => {
        activeComponents.splice(removedIndex, 0, removedComponent);
        saveToHistory();
        renderComponents();
        saveDraft();
    } : undefined);
};

const duplicateComponent = (id: string) => {
    const originalIndex = activeComponents.findIndex(c => c.id === id);
    if (originalIndex === -1) {
        console.error("Component to duplicate not found");
        return;
    }

    const originalComponent = activeComponents[originalIndex];
    const newComponent = JSON.parse(JSON.stringify(originalComponent)) as EmailComponent;
    const newId = Date.now().toString();
    newComponent.id = newId;

    activeComponents.splice(originalIndex + 1, 0, newComponent);
    
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Section duplicated', 'success');

    setTimeout(() => {
        selectComponent(newId);
        const newElement = document.querySelector(`.component-item[data-id='${newId}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newElement.classList.add('highlight-pulse');
            setTimeout(() => newElement.classList.remove('highlight-pulse'), 1000);
        }
    }, 100);
};

const updateComponentData = (id: string, key: string, value: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (comp) {
        comp.data[key] = value;
        // Trigger preview immediately (already 300 ms debounced internally)
        triggerPreviewUpdate();
        // Debounce localStorage write — avoid blocking the main thread on every keystroke
        window.clearTimeout(draftPersistTimer);
        draftPersistTimer = window.setTimeout(persistDraft, 300);
        // Debounce history snapshot — JSON serialisation is expensive; no need per-keystroke
        window.clearTimeout(historyDebounceTimer);
        historyDebounceTimer = window.setTimeout(saveToHistory, 600);
    }
};

const updateSubOfferData = (componentId: string, index: number, key: string, value: string, offerKey: string = 'additionalOffers') => {
    const comp = activeComponents.find(c => c.id === componentId);
    if (comp && comp.type === 'sales_offer') {
        try {
            const offers = JSON.parse(comp.data[offerKey] || '[]');
            if (offers[index]) {
                offers[index][key] = value;
                comp.data[offerKey] = JSON.stringify(offers);
                saveDraft();
                saveToHistory();
            }
        } catch (e) {
            console.error("Failed to update sub-offer data", e);
        }
    }
};

const selectComponent = (id: string | null) => {
    if (selectedComponentId === id) return;

    // Deselect previous
    if (selectedComponentId) {
        const prevEl = document.querySelector(`.component-item[data-id='${selectedComponentId}']`);
        prevEl?.classList.remove('selected');
    }

    selectedComponentId = id;

    // Select new
    if (selectedComponentId) {
        const newEl = document.querySelector(`.component-item[data-id='${selectedComponentId}']`);
        newEl?.classList.add('selected');
    }
};

// --- START: Fix for missing functions
function generateServiceOfferFormHtml(comp: EmailComponent, suffix: string): string {
    const d = comp.data;

    const imgUrl = d[`imageUrl${suffix}`] || '';
    return `
        <div class="compact-separator"><span>Image</span></div>
        <div class="offer-img-row">
            <div class="offer-img-fields" style="display: flex;">
                <div class="img-field-group">
                    <div class="img-url-inner">
                        <input type="text" class="form-control compact" data-key="imageUrl${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferImage${suffix}" data-field-label="Image ${suffix || '1'}" value="${imgUrl}" placeholder="Image URL">
                        <button type="button" class="btn btn-secondary btn-sm upload-btn"><span class="material-symbols-rounded">upload</span></button>
                        <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="${suffix || '1'}">
                    </div>
                </div>
                <div class="img-field-group">
                    <input type="text" class="form-control compact" data-key="imageLink${suffix}" value="${d[`imageLink${suffix}`] || ''}" placeholder="Image Link">
                </div>
            </div>
        </div>
        <div class="img-thumbnail-preview" style="display: ${imgUrl ? 'block' : 'none'}">
            <img src="${imgUrl}" alt="" />
        </div>
        <div class="compact-separator"><span>Offer</span></div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="serviceTitle${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferTitle${suffix}" data-field-label="Service Title ${suffix || '1'}" value="${d[`serviceTitle${suffix}`] || ''}" placeholder="Title">
        </div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="couponCode${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferCoupon${suffix}" data-field-label="Offer ${suffix || '1'}" value="${d[`couponCode${suffix}`] || ''}" placeholder="Offer">
        </div>
        <div class="form-group">
            <textarea class="form-control" data-key="serviceDetails${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferDetails${suffix}" data-field-label="Service Details ${suffix || '1'}" placeholder="Details">${d[`serviceDetails${suffix}`] || ''}</textarea>
        </div>
        <div class="form-group">
            <textarea class="form-control" data-key="disclaimer${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferDisclaimer${suffix}" data-field-label="Disclaimer ${suffix || '1'}" placeholder="Disclaimer">${d[`disclaimer${suffix}`] || ''}</textarea>
        </div>
        <div class="compact-separator"><span>CTA</span></div>
        <div class="component-row component-row--keep-inline">
            <div class="component-row-item">
                <input type="text" class="form-control compact" data-key="buttonText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton${suffix}" data-field-label="Button ${suffix || '1'} Text" value="${d[`buttonText${suffix}`] || ''}" placeholder="Button Text">
            </div>
            <div class="component-row-item">
                <input type="text" class="form-control compact" data-key="buttonLink${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton${suffix}" data-field-label="Button ${suffix || '1'} Link" value="${d[`buttonLink${suffix}`] || ''}" placeholder="Button Link">
            </div>
        </div>
    `;
}

function generateSubOffersHtml(comp: EmailComponent, suffix: string): string {
    const offersKey = `additionalOffers${suffix}`;
    let offers: any[];
    try {
        offers = JSON.parse(comp.data[offersKey] || '[]');
    } catch {
        offers = [];
    }

    let html = offers.map((offer, index) => `
        <div class="sub-offer-item" data-index="${index}">
            <div class="sub-offer-header">
                <span class="sub-offer-label">Additional Offer ${index + 1}</span>
                <button type="button" class="btn btn-ghost btn-sm remove-sub-offer" data-index="${index}" data-offer-index="${suffix || '1'}" data-tooltip="Remove">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
            <div class="sub-offer-body">
                <div class="form-group">
                    <input type="text" class="form-control compact sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="separator" value="${offer.separator || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="separator${suffix}" data-sub-offer-index="${index}" data-field-label="Separator" placeholder="Separator Text">
                </div>
                <div class="form-group">
                    <input type="text" class="form-control compact sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="offer" value="${offer.offer || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="offer${suffix}" data-sub-offer-index="${index}" data-field-label="Offer Title" placeholder="Offer Title">
                </div>
                <div class="form-group">
                    <textarea class="form-control compact sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="details" data-stylable="true" data-component-id="${comp.id}" data-field-key="details${suffix}" data-sub-offer-index="${index}" data-field-label="Offer Details" placeholder="Details">${offer.details || ''}</textarea>
                </div>
            </div>
        </div>
    `).join('');

    html += `
        <button type="button" class="add-sub-offer-btn" data-offer-index="${suffix || '1'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Additional Offer
        </button>
    `;

    return html;
}

function generateSalesOfferFormHtml(comp: EmailComponent, suffix: string): string {
    const d = comp.data;
    const isGrid = d.layout === 'grid';
    let html = '';

    if (suffix === '2' || isGrid) {
        const salesImgUrl = d[`imageSrc${suffix}`] || '';
        html += `
            <div class="offer-img-row">
                <div class="offer-img-fields" style="display: flex;">
                    <div class="img-field-group">
                        <div class="img-url-inner">
                            <input type="text" class="form-control compact" data-key="imageSrc${suffix}" value="${salesImgUrl}" placeholder="Image URL">
                            <button type="button" class="btn btn-secondary btn-sm upload-btn"><span class="material-symbols-rounded">upload</span></button>
                            <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="${suffix || '1'}">
                        </div>
                    </div>
                    <div class="img-field-group">
                        <input type="text" class="form-control compact" data-key="imageLink${suffix}" value="${d[`imageLink${suffix}`] || ''}" placeholder="Image Link">
                    </div>
                </div>
            </div>
            <div class="img-thumbnail-preview" style="display: ${salesImgUrl ? 'block' : 'none'}">
                <img src="${salesImgUrl}" alt="" />
            </div>
        `;
    }

    html += `
        <div class="compact-separator"><span>Vehicle</span></div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="vehicleText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="vehicle${suffix}" data-field-label="Vehicle Text" value="${d[`vehicleText${suffix}`] || ''}" placeholder="Vehicle">
        </div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="vinValue${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="stockVin${suffix}" data-field-label="VIN" value="${d[`vinValue${suffix}`] || ''}" placeholder="VIN">
        </div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="stockValue${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="stockVin${suffix}" data-field-label="Stock #" value="${d[`stockValue${suffix}`] || ''}" placeholder="Stock #">
        </div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="mileageValue${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="mileage${suffix}" data-field-label="Mileage" value="${d[`mileageValue${suffix}`] || ''}" placeholder="Mileage">
        </div>
        <div class="compact-separator"><span>Offer</span></div>
        <div class="form-group">
            <input type="text" class="form-control compact" data-key="mainOfferText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="mainOffer${suffix}" data-field-label="Main Offer" value="${d[`mainOfferText${suffix}`] || ''}" placeholder="Main Offer">
        </div>
        <div class="form-group">
            <textarea class="form-control" data-key="detailsText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="details${suffix}" data-field-label="Details" placeholder="Details">${d[`detailsText${suffix}`] || ''}</textarea>
        </div>

        <div class="sub-offers-container" id="sub-offers-${comp.id}${suffix}">
            ${generateSubOffersHtml(comp, suffix)}
        </div>

        <div class="compact-separator"><span>Details</span></div>
        <div class="form-group">
            <textarea class="form-control" data-key="disclaimerText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimer${suffix}" data-field-label="Disclaimer" placeholder="Disclaimer">${d[`disclaimerText${suffix}`] || ''}</textarea>
        </div>
        <div class="compact-separator"><span>CTA</span></div>
        <div class="component-row component-row--keep-inline">
            <div class="component-row-item">
                <input type="text" class="form-control compact" data-key="btnText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton${suffix}" data-field-label="Button Text" value="${d[`btnText${suffix}`] || ''}" placeholder="Button Text">
            </div>
            <div class="component-row-item">
                <input type="text" class="form-control compact" data-key="btnLink${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton${suffix}" data-field-label="Button Link" value="${d[`btnLink${suffix}`] || ''}" placeholder="Button Link">
            </div>
        </div>
    `;

    return html;
}
// --- END: Fix for missing functions

const COMPONENT_TYPE_ICONS: Record<string, string> = {
    header: 'format_h1',
    text_block: 'format_align_justify',
    image: 'image',
    button: 'radio_button_checked',
    divider: 'horizontal_rule',
    spacer: 'expand_all',
    service_offer: 'handyman',
    sales_offer: 'sell',
    disclaimers: 'contract',
    footer: 'link',
};

const getComponentTypeIcon = (type: string): string => COMPONENT_TYPE_ICONS[type] || 'widgets';

const formatComponentTypeName = (type: string): string =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const renderComponents = () => {
    componentsContainer.innerHTML = '';
    if (activeComponents.length === 0) {
        componentsContainer.innerHTML = `
            <div id="empty-state-message" style="text-align: center; padding: var(--spacing-2xl) var(--spacing-lg); border: 2px dashed var(--separator-primary); border-radius: var(--radius-lg); color: var(--label-secondary);">
                <p>No sections added yet. Click "+ Add Section" to begin.</p>
            </div>
        `;
        return;
    }

    activeComponents.forEach((comp, index) => {
        const item = document.createElement('div');
        item.className = 'component-item card';
        if (comp.id === selectedComponentId) {
            item.classList.add('selected');
        }
        item.setAttribute('data-id', comp.id);
        item.setAttribute('draggable', 'true');
        item.setAttribute('tabindex', '-1'); // Make it focusable for selection
        
        item.addEventListener('click', (e) => {
            // Prevent selection when interacting with form elements inside
            if ((e.target as HTMLElement).closest('.card-body, .card-header button, .drag-handle')) return;
             selectComponent(comp.id);
        });

        if (collapsedStates[comp.id]) {
            item.classList.add('collapsed');
        }
        
        let componentFormHtml = '';
        let dynamicTitle = '';
        const defaultTitleText = comp.type.replace(/_/g, ' ');
        let sourceFieldKey = '';
        const TRUNCATE_LENGTH = 34;

        switch (comp.type) {
            case 'header':
            case 'text_block':
            case 'disclaimers':
                sourceFieldKey = 'text';
                break;
            case 'image':
                sourceFieldKey = 'alt';
                break;
            case 'button':
                sourceFieldKey = 'text';
                break;
            case 'footer':
                sourceFieldKey = null;
                break;
            case 'sales_offer':
                sourceFieldKey = 'vehicleText';
                break;
            case 'service_offer':
                sourceFieldKey = 'serviceTitle';
                break;
            case 'divider':
            case 'spacer':
                sourceFieldKey = ''; // No dynamic title source
                break;
        }

        const sourceValue = sourceFieldKey ? comp.data[sourceFieldKey] || '' : '';
        dynamicTitle = sourceValue ? truncate(sourceValue, TRUNCATE_LENGTH) : defaultTitleText;
        
        if (comp.type === 'header') {
            componentFormHtml = `
                <div class="form-group">
                    <textarea class="form-control" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="header" data-field-label="Header Content" placeholder="Header Content">${comp.data.text || ''}</textarea>
                </div>
            `;
        } else if (comp.type === 'text_block') {
            componentFormHtml = `
                <div class="form-group">
                    <textarea class="form-control" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="textBlock" data-field-label="Text Block Content" placeholder="Text Content">${comp.data.text || ''}</textarea>
                </div>
            `;
        } else if (comp.type === 'disclaimers') {
            componentFormHtml = `
                <div class="form-group">
                    <textarea class="form-control" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimers" data-field-label="Disclaimer Text" placeholder="Disclaimer Text">${comp.data.text || ''}</textarea>
                </div>
            `;
        } else if (comp.type === 'image') {
            componentFormHtml = `
                <div class="img-fields-row">
                    <div class="img-field-group">
                        <div class="img-url-inner">
                            <input type="text" class="form-control compact" data-key="src" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Source" value="${comp.data.src || ''}" placeholder="Image URL">
                            <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                            <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp">
                        </div>
                    </div>
                    <div class="img-field-group">
                        <input type="text" class="form-control compact" data-key="link" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Link" value="${comp.data.link || ''}" placeholder="Image Link">
                    </div>
                </div>
                <div class="img-thumbnail-preview" style="display: ${comp.data.src && comp.data.src !== 'https://via.placeholder.com/600x300' ? 'block' : 'none'}">
                    <img src="${comp.data.src || ''}" alt="" />
                </div>
            `;
        } else if (comp.type === 'button') {
            componentFormHtml = `
                <div class="component-row component-row--keep-inline">
                    <div class="component-row-item">
                        <input type="text" class="form-control compact" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="button" data-field-label="Button Text" value="${comp.data.text || ''}" placeholder="Button Text">
                    </div>
                    <div class="component-row-item">
                        <input type="text" class="form-control compact" data-key="link" data-stylable="true" data-component-id="${comp.id}" data-field-key="button" data-field-label="Button Link" value="${comp.data.link || ''}" placeholder="Button Link">
                    </div>
                </div>
            `;
        } else if (comp.type === 'footer') {
            let footerLinks: {text: string; url: string}[] = [];
            try { footerLinks = JSON.parse(comp.data.links || '[]'); } catch { footerLinks = []; }

            const layoutToggle = `
                <div class="component-row" style="margin-bottom: 8px;">
                    <div class="component-row-item" style="flex: 1;">
                        <label class="form-label">Layout</label>
                        <div class="footer-layout-toggle">
                            <button type="button" class="footer-layout-btn ${comp.data.layout === 'inline' ? 'active' : ''}" data-key="layout" data-value="inline" data-tooltip="Side by Side">
                                <span class="material-symbols-rounded" style="font-size: 16px;">view_column</span> Inline
                            </button>
                            <button type="button" class="footer-layout-btn ${comp.data.layout === 'stacked' ? 'active' : ''}" data-key="layout" data-value="stacked" data-tooltip="Stacked">
                                <span class="material-symbols-rounded" style="font-size: 16px;">view_agenda</span> Stacked
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const separatorLabel = comp.data.separatorStyle === 'pipe' ? '|' : comp.data.separatorStyle === 'dash' ? '—' : '·';
            const linksHtml = footerLinks.map((link, i) => `
                <div class="footer-link-item" data-link-index="${i}">
                    <div class="footer-link-fields">
                        <div class="component-row component-row--keep-inline">
                            <div class="component-row-item">
                                <input type="text" class="form-control compact footer-link-field" data-link-index="${i}" data-link-field="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="footerLinks" data-field-label="Link Text" value="${link.text || ''}" placeholder="Link Text">
                            </div>
                            <div class="component-row-item">
                                <input type="text" class="form-control compact footer-link-field" data-link-index="${i}" data-link-field="url" value="${link.url || ''}" placeholder="Link URL">
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm remove-footer-link" data-link-index="${i}" data-tooltip="Remove" style="color: var(--destructive); flex-shrink: 0; padding: 2px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
                    </button>
                </div>
            `).join('');

            const separatorPreview = comp.data.layout === 'inline' ? `
                <div class="footer-separator-preview" data-stylable="true" data-component-id="${comp.id}" data-field-key="footerSeparator" data-field-label="Separator" tabindex="0">
                    <span class="footer-separator-sample" style="color: ${comp.data.separatorColor || '#c7c7cc'}; font-size: ${comp.data.fontSize || 12}px;">
                        Link ${separatorLabel} Link ${separatorLabel} Link
                    </span>
                </div>
            ` : '';

            const containerPreview = `
                <div class="footer-container-preview" data-stylable="true" data-component-id="${comp.id}" data-field-key="footerContainer" data-field-label="Container" tabindex="0">
                    <span class="material-symbols-rounded" style="font-size: 14px; color: var(--label-tertiary);">settings</span>
                    <span style="font-size: 11px; color: var(--label-secondary);">Container &amp; Alignment</span>
                </div>
            `;

            componentFormHtml = `
                ${layoutToggle}
                <div class="footer-links-list">${linksHtml}</div>
                <button type="button" class="add-footer-link-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Footer Link
                </button>
                ${separatorPreview}
                ${containerPreview}
            `;
        } else if (comp.type === 'divider') {
            componentFormHtml = `
                <div class="divider-preview-container" tabindex="0" data-alignment="${comp.data.alignment}" style="padding: ${comp.data.paddingTop}px 15px ${comp.data.paddingBottom}px 15px;" data-stylable="true" data-component-id="${comp.id}" data-field-key="divider" data-field-label="Divider">
                    <div class="divider-preview-line" style="width: ${comp.data.width}%; height: ${comp.data.thickness}px; background-color: ${comp.data.lineColor};"></div>
                </div>
            `;
        } else if (comp.type === 'spacer') {
            const matchBg = comp.data.matchEmailBackground === 'true';
            const bgColor = matchBg ? 'transparent' : comp.data.backgroundColor;
            const hasBg = !matchBg && bgColor !== 'transparent';

            componentFormHtml = `
                <div class="spacer-preview ${hasBg ? 'has-bg-color' : ''}" style="height: ${comp.data.height}px; background-color: ${bgColor};" data-stylable="true" data-component-id="${comp.id}" data-field-key="spacer" data-field-label="Spacer" tabindex="0">
                    <span class="spacer-preview-label">Height: ${comp.data.height}px</span>
                </div>
            `;
        } else if (comp.type === 'service_offer') {
            const isGrid = comp.data.layout === 'grid';
            componentFormHtml = `
                <div class="offer-columns-container" data-layout="${comp.data.layout || 'center'}">
                    <div class="offer-column">
                        ${isGrid ? '<h4 class="offer-column-title">Offer 1</h4>' : ''}
                        ${generateServiceOfferFormHtml(comp, '')}
                    </div>
                    <div class="offer-column offer-column-2">
                        <h4 class="offer-column-title">Offer 2</h4>
                        ${generateServiceOfferFormHtml(comp, '2')}
                    </div>
                </div>
            `;
        } else if (comp.type === 'sales_offer') {
            // Data Migration for old templates
            if (comp.data.stockVinText && !comp.data.stockVinValue) {
                comp.data.stockVinValue = comp.data.stockVinText;
                delete comp.data.stockVinText;
            }
            if (comp.data.mileageText && !comp.data.mileageValue) {
                comp.data.mileageValue = comp.data.mileageText;
                delete comp.data.mileageText;
            }
            // Migrate old stockVinType/stockVinValue to separate vinValue/stockValue
            ['', '2'].forEach(sfx => {
                if (comp.data[`stockVinValue${sfx}`] && !comp.data[`vinValue${sfx}`] && !comp.data[`stockValue${sfx}`]) {
                    if (comp.data[`stockVinType${sfx}`] === 'vin') {
                        comp.data[`vinValue${sfx}`] = comp.data[`stockVinValue${sfx}`];
                        comp.data[`stockValue${sfx}`] = '';
                    } else {
                        comp.data[`stockValue${sfx}`] = comp.data[`stockVinValue${sfx}`];
                        comp.data[`vinValue${sfx}`] = '';
                    }
                }
            });
            const isGrid = comp.data.layout === 'grid';
            componentFormHtml = `
                ${!isGrid ? `
                <div class="single-offer-settings">
                  <div class="offer-img-row">
                      <div class="offer-img-fields" style="display: flex;">
                          <div class="img-field-group">
                              <div class="img-url-inner">
                                  <input type="text" class="form-control compact" data-key="imageSrc" value="${comp.data.imageSrc || ''}" placeholder="Image URL">
                                  <button type="button" class="btn btn-secondary btn-sm upload-btn"><span class="material-symbols-rounded">upload</span></button>
                                  <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="1">
                              </div>
                          </div>
                          <div class="img-field-group">
                              <input type="text" class="form-control compact" data-key="imageLink" value="${comp.data.imageLink || ''}" placeholder="Image Link">
                          </div>
                      </div>
                  </div>
                  <div class="img-thumbnail-preview" style="display: ${comp.data.imageSrc ? 'block' : 'none'}">
                      <img src="${comp.data.imageSrc || ''}" alt="" />
                  </div>
                </div>
                ` : ''}

                <div class="offer-columns-container" data-layout="${comp.data.layout || 'center'}">
                    <div class="offer-column">
                        ${!isGrid ? '' : '<h4 class="offer-column-title">Offer 1</h4>'}
                        ${generateSalesOfferFormHtml(comp, '')}
                    </div>
                    <div class="offer-column offer-column-2">
                         <h4 class="offer-column-title">Offer 2</h4>
                        ${generateSalesOfferFormHtml(comp, '2')}
                    </div>
                </div>
            `;
        }

        const typeIcon = getComponentTypeIcon(comp.type);

        const currentTextLayout = comp.data.textLayout || 'center';
        let offerHeaderControls = '';
        if (comp.type === 'sales_offer') {
            const isSLeft = comp.data.layout === 'left';
            const isSCenter = comp.data.layout === 'center' || !comp.data.layout;
            const isSRight = comp.data.layout === 'right';
            const isSGrid = comp.data.layout === 'grid';
            offerHeaderControls = `
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn layout-toggle ${isSLeft ? 'active' : ''}" data-key="layout" data-value="left" data-tooltip="Image Left"><span class="material-symbols-rounded">split_scene_left</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSCenter ? 'active' : ''}" data-key="layout" data-value="center" data-tooltip="Center"><span class="material-symbols-rounded">split_scene_up</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSRight ? 'active' : ''}" data-key="layout" data-value="right" data-tooltip="Image Right"><span class="material-symbols-rounded">split_scene_right</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSGrid ? 'active' : ''}" data-key="layout" data-value="grid" data-tooltip="Grid"><span class="material-symbols-rounded">splitscreen_vertical_add</span></button>
                </div>
                <span class="header-toggle-divider"></span>
            `;
        } else if (comp.type === 'service_offer') {
            const isSvcLeft = comp.data.layout === 'left';
            const isSvcCenter = comp.data.layout === 'center' || !comp.data.layout || comp.data.layout === 'single';
            const isSvcRight = comp.data.layout === 'right';
            const isSvcGrid = comp.data.layout === 'grid';
            offerHeaderControls = `
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn layout-toggle ${isSvcLeft ? 'active' : ''}" data-key="layout" data-value="left" data-tooltip="Image Left"><span class="material-symbols-rounded">split_scene_left</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSvcCenter ? 'active' : ''}" data-key="layout" data-value="center" data-tooltip="Center"><span class="material-symbols-rounded">split_scene_up</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSvcRight ? 'active' : ''}" data-key="layout" data-value="right" data-tooltip="Image Right"><span class="material-symbols-rounded">split_scene_right</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSvcGrid ? 'active' : ''}" data-key="layout" data-value="grid" data-tooltip="Grid"><span class="material-symbols-rounded">splitscreen_vertical_add</span></button>
                </div>
                <span class="header-toggle-divider"></span>
            `;
        }
        if (comp.type === 'sales_offer' || comp.type === 'service_offer') {
            offerHeaderControls += `
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn text-layout-toggle ${currentTextLayout === 'left' ? 'active' : ''}" data-key="textLayout" data-value="left" data-tooltip="Align Left"><span class="material-symbols-rounded">format_align_left</span></button>
                    <button type="button" class="toggle-btn text-layout-toggle ${currentTextLayout === 'center' ? 'active' : ''}" data-key="textLayout" data-value="center" data-tooltip="Align Center"><span class="material-symbols-rounded">format_align_center</span></button>
                    <button type="button" class="toggle-btn text-layout-toggle ${currentTextLayout === 'right' ? 'active' : ''}" data-key="textLayout" data-value="right" data-tooltip="Align Right"><span class="material-symbols-rounded">format_align_right</span></button>
                </div>
                <span class="header-toggle-divider"></span>
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn border-toggle ${comp.data.showBorder !== 'false' ? 'active' : ''}" data-key="showBorder" data-value="${comp.data.showBorder !== 'false' ? 'false' : 'true'}" data-tooltip="Card Border"><span class="material-symbols-rounded">crop_square</span></button>
                </div>
                <span class="header-toggle-divider"></span>
            `;
            if (comp.data.layout === 'grid') {
                const isReversed = comp.data.mobileReverse === 'true';
                offerHeaderControls += `
                    <div class="toggle-group header-toggle-group">
                        <button type="button" class="toggle-btn mobile-reverse-toggle ${isReversed ? 'active' : ''}" data-key="mobileReverse" data-value="${isReversed ? 'false' : 'true'}" data-tooltip="${isReversed ? 'Mobile order: reversed (click to reset)' : 'Reverse column order on mobile'}"><span class="material-symbols-rounded">swap_vert</span></button>
                    </div>
                    <span class="header-toggle-divider"></span>
                `;
            }
        }
        item.innerHTML = `
            <div class="card-header">
                <span class="drag-handle" data-tooltip="Drag to reorder">
                    <svg width="9" height="12" viewBox="0 0 12 16" fill="currentColor">
                        <circle cx="3" cy="3" r="1.5"></circle>
                        <circle cx="9" cy="3" r="1.5"></circle>
                        <circle cx="3" cy="8" r="1.5"></circle>
                        <circle cx="9" cy="8" r="1.5"></circle>
                        <circle cx="3" cy="13" r="1.5"></circle>
                        <circle cx="9" cy="13" r="1.5"></circle>
                    </svg>
                </span>
                <div class="header-content-wrapper">
                    <span class="collapse-icon">▼</span>
                    <span class="material-symbols-rounded component-type-icon">${typeIcon}</span>
                    <span id="component-title-${comp.id}" class="component-title text-xs font-bold uppercase" style="color: var(--label-secondary);">${index + 1} - ${dynamicTitle}</span>
                </div>
                <div class="flex items-center" style="gap: 3px;">
                    ${offerHeaderControls}
                    <button type="button" class="btn btn-ghost btn-sm save-to-library-btn" data-tooltip="Save to Library">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    ${comp.librarySourceId ? `<button type="button" class="btn btn-ghost btn-sm update-library-btn" data-tooltip="Update Library Component" style="color:var(--system-blue);">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>` : ''}
                    <button type="button" class="btn btn-ghost btn-sm reset-comp-btn" data-tooltip="Reset Styles">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm clear-comp-btn" data-tooltip="Clear Content">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm duplicate-comp-btn" data-tooltip="Duplicate">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm remove-comp-btn" data-tooltip="Delete">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${componentFormHtml}
            </div>
        `;
        
        item.querySelector('.header-content-wrapper')?.addEventListener('click', () => toggleComponent(comp.id));

        const sourceInput = item.querySelector(`[data-key="${sourceFieldKey}"]`);
        if (sourceInput) {
            sourceInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement | HTMLTextAreaElement;
                const titleEl = document.getElementById(`component-title-${comp.id}`);
                if (titleEl) {
                    const newTitle = target.value ? truncate(target.value, TRUNCATE_LENGTH) : defaultTitleText;
                    titleEl.textContent = `${index + 1} - ${newTitle}`;
                }
            });
        }


        if (comp.type === 'image' || comp.type === 'sales_offer' || comp.type === 'service_offer') {
            item.querySelectorAll('.upload-btn').forEach(uploadBtn => {
                const fileInput = uploadBtn.nextElementSibling as HTMLInputElement;
                const offerIndex = fileInput?.dataset.offerIndex || '1';

                uploadBtn.addEventListener('click', () => fileInput?.click());

                fileInput?.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (file) {
                        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                        const maxSize = 5 * 1024 * 1024;
                        if (!validTypes.includes(file.type)) {
                            showToast('Invalid file type. Use JPG, PNG, GIF, or WEBP.', 'error');
                            return;
                        }
                        if (file.size > maxSize) {
                            showToast('File is too large. Max size is 5MB.', 'error');
                            return;
                        }

                        const originalBtnContent = uploadBtn.innerHTML;
                        const reader = new FileReader();
                        reader.onloadstart = () => {
                            uploadBtn.innerHTML = '...';
                            (uploadBtn as HTMLButtonElement).disabled = true;
                        };
                        reader.onload = (event) => {
                            const result = event.target?.result as string;
                            let keyToUpdate = 'src';
                            if (comp.type === 'sales_offer') keyToUpdate = offerIndex === '2' ? 'imageSrc2' : 'imageSrc';
                            if (comp.type === 'service_offer') keyToUpdate = offerIndex === '2' ? 'imageUrl2' : 'imageUrl';

                            updateComponentData(comp.id, keyToUpdate, result);
                            (item.querySelector(`input[data-key="${keyToUpdate}"]`) as HTMLInputElement).value = result;
                            // Update thumbnail preview
                            const thumbContainer = uploadBtn.closest('.img-fields-row, .offer-img-row, .single-offer-settings');
                            const thumbPreview = thumbContainer?.querySelector('.img-thumbnail-preview') || thumbContainer?.parentElement?.querySelector('.img-thumbnail-preview');
                            if (thumbPreview) {
                                const thumbImg = thumbPreview.querySelector('img') as HTMLImageElement;
                                if (thumbImg) thumbImg.src = result;
                                (thumbPreview as HTMLElement).style.display = 'block';
                            }
                            showToast('Image uploaded.', 'success');
                            uploadBtn.innerHTML = originalBtnContent;
                            (uploadBtn as HTMLButtonElement).disabled = false;
                        };
                        reader.onerror = () => {
                            showToast('Error reading file.', 'error');
                            uploadBtn.innerHTML = originalBtnContent;
                            (uploadBtn as HTMLButtonElement).disabled = false;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            });
        }

        if (comp.type === 'sales_offer') {
            item.querySelectorAll('.add-sub-offer-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const offerIndex = (btn as HTMLElement).dataset.offerIndex;
                    const offersKey = offerIndex === '2' ? 'additionalOffers2' : 'additionalOffers';
                    const current = JSON.parse(comp.data[offersKey] || '[]');
                    current.push({
                        separator: 'AND', separatorFontSize: '18', separatorFontWeight: 'normal', separatorFontStyle: 'normal', separatorColor: '#86868b', separatorBgColor: 'transparent', separatorTextAlign: 'center', separatorPaddingTop: '9', separatorPaddingBottom: '9', separatorPaddingLeftRight: '0',
                        offer: 'Additional Offer Title', offerFontSize: '21', offerFontWeight: 'normal', offerFontStyle: 'normal', offerColor: comp.data.mainOfferColor || '#007aff', offerBgColor: 'transparent', offerTextAlign: 'center', offerPaddingTop: '0', offerPaddingBottom: '3', offerPaddingLeftRight: '0',
                        details: 'Details for the additional offer.', detailsFontSize: '12', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsColor: comp.data.detailsColor || '#6e6e73', detailsBgColor: 'transparent', detailsTextAlign: 'center', detailsPaddingTop: '0', detailsPaddingBottom: '3', detailsPaddingLeftRight: '0',
                    });
                    updateComponentData(comp.id, offersKey, JSON.stringify(current));
                    renderComponents();
                });
            });

            item.querySelectorAll('.remove-sub-offer').forEach(btn => {
                btn.addEventListener('click', () => {
                    const offerIndex = (btn as HTMLElement).dataset.offerIndex;
                    const offersKey = offerIndex === '2' ? 'additionalOffers2' : 'additionalOffers';
                    const idx = parseInt(btn.getAttribute('data-index') || '0');
                    const current = JSON.parse(comp.data[offersKey] || '[]');
                    current.splice(idx, 1);
                    updateComponentData(comp.id, offersKey, JSON.stringify(current));
                    renderComponents();
                });
            });

            item.querySelectorAll('.sub-offer-field').forEach(input => {
                input.addEventListener('input', (e: any) => {
                    const target = e.target;
                    const offerIndex = (target as HTMLElement).dataset.offerIndex;
                    const offersKey = offerIndex === '2' ? 'additionalOffers2' : 'additionalOffers';
                    const idx = parseInt(target.getAttribute('data-index') || '0');
                    const field = target.getAttribute('data-field');
                    if (!field) return;

                    const current = JSON.parse(comp.data[offersKey] || '[]');
                    current[idx][field] = target.value;
                    
                    if (target.type === 'color') {
                        const swatch = target.nextElementSibling as HTMLElement;
                        if (swatch) swatch.style.background = target.value;
                    }
                    updateComponentData(comp.id, offersKey, JSON.stringify(current));
                });
            });
        }

        if (comp.type === 'footer') {
            // Layout toggle
            item.querySelectorAll('.footer-layout-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = (btn as HTMLElement).dataset.value || 'inline';
                    updateComponentData(comp.id, 'layout', value);
                    renderComponents();
                });
            });

            // Add footer link
            item.querySelectorAll('.add-footer-link-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const current = JSON.parse(comp.data.links || '[]');
                    current.push({ text: 'New Link', url: '' });
                    updateComponentData(comp.id, 'links', JSON.stringify(current));
                    renderComponents();
                });
            });

            // Remove footer link
            item.querySelectorAll('.remove-footer-link').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-link-index') || '0');
                    const current = JSON.parse(comp.data.links || '[]');
                    current.splice(idx, 1);
                    updateComponentData(comp.id, 'links', JSON.stringify(current));
                    renderComponents();
                });
            });

            // Edit footer link fields
            item.querySelectorAll('.footer-link-field').forEach(input => {
                input.addEventListener('input', (e: any) => {
                    const target = e.target;
                    const idx = parseInt(target.getAttribute('data-link-index') || '0');
                    const field = target.getAttribute('data-link-field');
                    if (!field) return;
                    const current = JSON.parse(comp.data.links || '[]');
                    if (current[idx]) {
                        current[idx][field] = target.value;
                        updateComponentData(comp.id, 'links', JSON.stringify(current));
                    }
                });
            });
        }

        item.querySelectorAll('input, textarea, select, button.layout-toggle, button.text-layout-toggle, button.border-toggle, button.mobile-reverse-toggle').forEach(input => {
            if (!input.classList.contains('sub-offer-field') && !input.classList.contains('footer-link-field')) {
                const eventType = (input.tagName === 'BUTTON' || (input as HTMLInputElement).type === 'checkbox') ? 'click' : 'input';
                input.addEventListener(eventType, (e) => {
                    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
                    const key = target.getAttribute('data-key');
                    if (key) {
                        let value = target.value;
                        if (target.tagName === 'BUTTON') {
                            value = (target as HTMLButtonElement).dataset.value || '';
                        }
                        if ((target as HTMLInputElement).type === 'checkbox') {
                           value = ((target as HTMLInputElement).checked).toString();
                        }
                        
                        updateComponentData(comp.id, key, value);

                        if ((comp.type === 'sales_offer' || comp.type === 'service_offer') && key === 'layout') {
                            renderComponents();
                        }

                        if ((comp.type === 'sales_offer' || comp.type === 'service_offer') && key === 'showBorder') {
                            // Flip button state in-place — no full re-render needed
                            const btn = target as HTMLButtonElement;
                            const isNowActive = value !== 'false';
                            btn.classList.toggle('active', isNowActive);
                            btn.dataset.value = isNowActive ? 'false' : 'true';
                            // Update preview immediately without debounce
                            window.clearTimeout(previewTimer);
                            if (previewPane) { const html = generateEmailHtml(); previewPane.srcdoc = html; updateHtmlSizeIndicator(html); }
                        }

                        if ((comp.type === 'sales_offer' || comp.type === 'service_offer') && key === 'mobileReverse') {
                            // Flip button state in-place — no full re-render needed
                            const btn = target as HTMLButtonElement;
                            const isNowReversed = value === 'true';
                            btn.classList.toggle('active', isNowReversed);
                            btn.dataset.value = isNowReversed ? 'false' : 'true';
                            btn.dataset.tooltip = isNowReversed ? 'Mobile order: reversed (click to reset)' : 'Reverse column order on mobile';
                            window.clearTimeout(previewTimer);
                            if (previewPane) { const html = generateEmailHtml(); previewPane.srcdoc = html; updateHtmlSizeIndicator(html); }
                        }

                        if (comp.type === 'sales_offer' && key === 'layout' && value !== 'grid') {
                            const newAlignment = value;
                            
                            const prefixes = ['vehicle', 'mainOffer', 'details', 'stockVin', 'mileage', 'disclaimer'];
                            prefixes.forEach(prefix => {
                                updateComponentData(comp.id, `${prefix}TextAlign`, newAlignment);
                            });

                            updateComponentData(comp.id, 'btnAlign', newAlignment);

                            try {
                                const offers = JSON.parse(comp.data.additionalOffers || '[]');
                                const updatedOffers = offers.map((offer: any) => ({
                                    ...offer,
                                    separatorTextAlign: newAlignment,
                                    offerTextAlign: newAlignment,
                                    detailsTextAlign: newAlignment,
                                    disclaimerTextAlign: newAlignment
                                }));
                                updateComponentData(comp.id, 'additionalOffers', JSON.stringify(updatedOffers));
                            } catch (error) {
                                console.error("Failed to update sub-offer alignments:", error);
                            }
                            renderStylingPanel();
                        }

                        if (comp.type === 'service_offer' && key === 'layout' && value !== 'grid') {
                            const newAlignment = value === 'single' ? 'center' : value;
                            ['titleAlignment', 'couponAlignment', 'detailsAlignment',
                             'disclaimerAlignment', 'buttonAlignment'].forEach(field => {
                                updateComponentData(comp.id, `${field}`, newAlignment);
                            });
                            renderStylingPanel();
                        }

                        if (key === 'textLayout') {
                            // Update active state of text-layout buttons without full re-render
                            item.querySelectorAll('.text-layout-toggle').forEach(btn => {
                                btn.classList.toggle('active', btn.getAttribute('data-value') === value);
                            });
                        }

                        if (comp.type === 'sales_offer' && key === 'textLayout') {
                            ['', '2'].forEach(sfx => {
                                ['vehicleTextAlign', 'mainOfferTextAlign', 'detailsTextAlign',
                                 'stockVinTextAlign', 'mileageTextAlign', 'disclaimerTextAlign'].forEach(field => {
                                    updateComponentData(comp.id, `${field}${sfx}`, value);
                                });
                                updateComponentData(comp.id, `btnAlign${sfx}`, value);
                                try {
                                    const offerKey = `additionalOffers${sfx}`;
                                    const offers = JSON.parse(comp.data[offerKey] || '[]');
                                    updateComponentData(comp.id, offerKey, JSON.stringify(
                                        offers.map((o: any) => ({ ...o,
                                            separatorTextAlign: value, offerTextAlign: value,
                                            detailsTextAlign: value, disclaimerTextAlign: value }))
                                    ));
                                } catch {}
                            });
                            renderStylingPanel();
                        }

                        if (comp.type === 'service_offer' && key === 'textLayout') {
                            ['', '2'].forEach(sfx => {
                                ['titleAlignment', 'couponAlignment', 'detailsAlignment',
                                 'disclaimerAlignment', 'buttonAlignment'].forEach(field => {
                                    updateComponentData(comp.id, `${field}${sfx}`, value);
                                });
                            });
                            renderStylingPanel();
                        }

                        if (target.type === 'color') {
                           const swatch = (target.parentElement as HTMLElement).querySelector('.color-swatch-display') as HTMLElement;
                           if(swatch) swatch.style.background = target.value;
                        }

                    }
                });
            }
        });

        item.querySelectorAll('.format-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key') as string;
                const onVal = btn.getAttribute('data-val-on') as string;
                const offVal = btn.getAttribute('data-val-off') as string;
                const currentVal = comp.data[key];
                const newVal = currentVal === onVal ? offVal : onVal;
                
                updateComponentData(comp.id, key, newVal);
                btn.classList.toggle('active');
            });
        });

        item.querySelector('.reset-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            resetComponentStyles(comp.id);
        });

        item.querySelector('.clear-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            clearComponentContent(comp.id);
        });

        item.querySelector('.save-to-library-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            saveComponentToLibrary(comp.id);
        });

        item.querySelector('.update-library-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            updateLibraryComponent(comp.id);
        });

        item.querySelector('.duplicate-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateComponent(comp.id);
        });

        item.querySelector('.remove-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            removeComponent(comp.id)
        });

        // Auto-resize textareas — defer scrollHeight read to rAF to avoid layout thrashing
        const resizeTextarea = (el: HTMLTextAreaElement) => {
            requestAnimationFrame(() => {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            });
        };
        item.querySelectorAll('textarea.form-control').forEach(ta => {
            const el = ta as HTMLTextAreaElement;
            resizeTextarea(el);
            el.addEventListener('input', () => resizeTextarea(el));
        });

        // Update image thumbnail on URL change
        item.querySelectorAll('input[data-key="src"], input[data-key="imageSrc"], input[data-key="imageSrc2"], input[data-key="imageUrl"], input[data-key="imageUrl2"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                const container = (e.target as HTMLElement).closest('.img-fields-row, .offer-img-fields, .img-field-group')?.closest('.img-fields-row, .offer-img-row, .single-offer-settings');
                const preview = container?.querySelector('.img-thumbnail-preview') || container?.parentElement?.querySelector('.img-thumbnail-preview');
                if (preview) {
                    const img = preview.querySelector('img') as HTMLImageElement;
                    if (img) img.src = val;
                    (preview as HTMLElement).style.display = val ? 'block' : 'none';
                }
            });
        });

        // URL validation for link/src fields (debounced on input, immediate on init)
        item.querySelectorAll('input[data-key="src"], input[data-key="link"], input[data-key="imageLink"], input[data-key="imageLink2"], input[data-key="imageUrl"], input[data-key="imageUrl2"], input[data-key="imageSrc"], input[data-key="imageSrc2"], input[data-key="buttonLink"], input[data-key="buttonLink2"], input[data-key="btnLink"], input[data-key="btnLink2"]').forEach(input => {
            const doValidate = () => {
                const val = (input as HTMLInputElement).value.trim();
                const isValid = !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('mailto:') || val.startsWith('tel:');
                input.classList.toggle('url-invalid', !isValid);
            };
            let validateTimer: number;
            input.addEventListener('input', () => {
                window.clearTimeout(validateTimer);
                validateTimer = window.setTimeout(doValidate, 150);
            });
            doValidate(); // run immediately on init, no debounce needed
        });

        componentsContainer.appendChild(item);
    });

    initializeDragAndDrop();
};

function initializeDragAndDrop() {
    const components = componentsContainer.querySelectorAll('.component-item');

    const dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';

    let dropBeforeId: string | null = null; // null → append to end

    const removeIndicator = () => {
        dropIndicator.parentNode?.removeChild(dropIndicator);
    };

    components.forEach(comp => {
        comp.addEventListener('dragstart', () => {
            draggedComponentId = comp.getAttribute('data-id');
            setTimeout(() => comp.classList.add('dragging'), 0);
        });

        comp.addEventListener('dragend', () => {
            comp.classList.remove('dragging');
            draggedComponentId = null;
            dropBeforeId = null;
            removeIndicator();
        });

        comp.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLElement;
            if (target.getAttribute('data-id') === draggedComponentId) return;

            const rect = target.getBoundingClientRect();
            if ((e as DragEvent).clientY < rect.top + rect.height / 2) {
                dropBeforeId = target.getAttribute('data-id');
                componentsContainer.insertBefore(dropIndicator, target);
            } else {
                const next = target.nextElementSibling;
                dropBeforeId = (next?.classList.contains('component-item'))
                    ? next.getAttribute('data-id')
                    : null;
                componentsContainer.insertBefore(dropIndicator, next ?? null);
            }
        });

        comp.addEventListener('drop', (e) => {
            e.preventDefault();
            removeIndicator();
            if (!draggedComponentId) return;

            const draggedIndex = activeComponents.findIndex(c => c.id === draggedComponentId);
            if (draggedIndex === -1) return;

            const [draggedItem] = activeComponents.splice(draggedIndex, 1);
            if (dropBeforeId === null) {
                activeComponents.push(draggedItem);
            } else {
                const targetIndex = activeComponents.findIndex(c => c.id === dropBeforeId);
                activeComponents.splice(targetIndex > -1 ? targetIndex : activeComponents.length, 0, draggedItem);
            }

            saveToHistory();
            saveDraft();
            renderComponents();
            showToast('Component moved', 'success');
        });
    });

    // Hide indicator if cursor leaves the container entirely
    componentsContainer.addEventListener('dragleave', (e) => {
        if (!componentsContainer.contains(e.relatedTarget as Node)) {
            removeIndicator();
            dropBeforeId = null;
        }
    });
}

function generateEmailHtml(): string {
  let sectionsHtml = '';

  // Pre-pass: build per-component mobile override CSS rules
  let mobileOverrideCss = '';
  activeComponents.forEach(comp => {
      const d = comp.data || {};
      const mobCls = `mc-${comp.id.replace(/-/g, '')}`;
      const rules: string[] = [];
      if (d.mobileFontSize) rules.push(`font-size: ${parseInt(d.mobileFontSize)}px !important; line-height: 1.4 !important;`);
      if (d.mobilePadding) rules.push(`padding-left: ${parseInt(d.mobilePadding)}px !important; padding-right: ${parseInt(d.mobilePadding)}px !important;`);
      if (d.mobileAlignment) rules.push(`text-align: ${d.mobileAlignment} !important;`);
      if (rules.length) mobileOverrideCss += `            .${mobCls} { ${rules.join(' ')} }\n`;
  });

  activeComponents.forEach(comp => {
    const d = comp.data || {};
    const isTransparent = d.backgroundColor === 'transparent';
    const mobCls = `mc-${comp.id.replace(/-/g, '')}`;
    const hideRowClass = d.mobileHide === 'true' ? 'hide-mobile' : '';
    
    if (comp.type === 'header' || comp.type === 'text_block' || comp.type === 'disclaimers') {
      const styles = [
          `padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px`,
          `background-color: ${d.backgroundColor || 'transparent'}`,
          `color: ${d.textColor || '#000'}`,
          `font-size: ${d.fontSize || 16}px`,
          `text-align: ${d.textAlign || 'left'}`,
          `font-weight: ${d.fontWeight || 'normal'}`,
          `font-style: ${d.fontStyle || 'normal'}`,
          `line-height: 1.5`,
          `font-family: ${designSettings.fontFamily}`
      ].join(';');
      
      const txt = DOMPurify.sanitize(d.text || '');
      sectionsHtml += `
        <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
            <td align="${d.textAlign || 'left'}" ${isTransparent ? '' : `bgcolor="${d.backgroundColor}"`} class="${mobCls} mobile-pad" style="${styles}">
                <div style="font-family: ${designSettings.fontFamily}; color: ${d.textColor || '#000'}; font-size: ${d.fontSize || 16}px;">
                    ${txt.replace(/\n/g, '<br>')}
                </div>
            </td>
        </tr>
      `;
    } else if (comp.type === 'image') {
        const numericWidth = parseFloat((d.width || '100%').replace(/%/g, '')) || 100;
        const styleWidth = `${numericWidth}%`;
        const imgWidthAttr = Math.round((numericWidth / 100) * 600);
        const imgStyles = [`display: block`, `max-width: 100%`, `width: ${styleWidth}`, `height: auto`, `border: 0`, `margin: ${d.align === 'center' ? '0 auto' : '0'}`].join(';');
        let imgTag = `<img src="${DOMPurify.sanitize(d.src || '')}" alt="${DOMPurify.sanitize(d.alt || 'Image')}" class="responsive-img" width="${imgWidthAttr}" style="${imgStyles}" border="0" />`;
        if (d.link) imgTag = `<a href="${DOMPurify.sanitize(d.link)}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
        sectionsHtml += `
            <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                <td align="${d.align || 'center'}" ${isTransparent ? '' : `bgcolor="${d.backgroundColor}"`} class="${mobCls} mobile-pad" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    <div style="display: block; width: 100%; max-width: ${styleWidth};">${imgTag}</div>
                </td>
            </tr>
        `;
    } else if (comp.type === 'button') {
        const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
        const isOutlined = designSettings.buttonStyle === 'outlined';
        let tableWidthAttr = "100%";
        const widthType = d.widthType || 'full';
        if (widthType === 'auto') tableWidthAttr = "";
        else if (widthType === 'small') tableWidthAttr = "160";
        else if (widthType === 'medium') tableWidthAttr = "280";
        else if (widthType === 'large') tableWidthAttr = "400";

        const btnStyles = [`background-color: ${isOutlined ? 'transparent' : d.backgroundColor}`, `color: ${isOutlined ? d.backgroundColor : d.textColor}`, `padding: ${d.paddingTop || 12}px ${d.paddingLeftRight || '20'}px ${d.paddingBottom || 12}px`, `text-decoration: none`, `display: block`, `font-weight: bold`, `border-radius: ${radius}`, `font-size: ${d.fontSize}px`, `font-family: ${designSettings.fontFamily}`, `text-align: center`, isOutlined ? `border: 2px solid ${d.backgroundColor}` : 'border: 0'].join(';');

        const widthStyle = widthType === 'full' ? '100%' : (tableWidthAttr ? `${tableWidthAttr}px` : 'auto');
        const sanitizedLink = DOMPurify.sanitize(d.link || '#');
        const sanitizedText = DOMPurify.sanitize(d.text || 'Button');
        const bgColor = d.backgroundColor || '#007aff';
        const txtColor = d.textColor || '#ffffff';
        const vmlHeight = (parseInt(d.paddingTop || '12') + parseInt(d.paddingBottom || '12') + parseInt(d.fontSize || '16')) * 1.3;
        const vmlArcSize = radius.includes('px') ? `${Math.min(50, (parseInt(radius) / (vmlHeight / 2)) * 100)}%` : '8%';
        const vmlWidthStyle = widthType !== 'auto' ? `width:${widthStyle};` : '';
        const vmlBtn = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${sanitizedLink}" style="height:${vmlHeight}px;v-text-anchor:middle;${vmlWidthStyle}" arcsize="${vmlArcSize}" strokecolor="${isOutlined ? bgColor : 'none'}" strokeweight="${isOutlined ? '2px' : '0'}" fillcolor="${isOutlined ? 'transparent' : bgColor}"><w:anchorlock/><center style="color:${isOutlined ? bgColor : txtColor};font-family:Arial,sans-serif;font-size:${d.fontSize || 16}px;font-weight:bold;">${sanitizedText}</center></v:roundrect><![endif]-->`;
        const htmlBtn = `<!--[if !mso]><!--><a href="${sanitizedLink}" target="_blank" style="${btnStyles}">${sanitizedText}</a><!--<![endif]-->`;

        sectionsHtml += `
            <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                <td align="${d.align || 'center'}" class="${mobCls}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    <table border="0" cellspacing="0" cellpadding="0" ${tableWidthAttr ? `width="${tableWidthAttr}"` : ""} style="margin: ${d.align === 'center' ? '0 auto' : '0'}; width: ${widthStyle}; max-width: 100%;">
                        <tr>
                            <td align="center" bgcolor="${isOutlined ? 'transparent' : bgColor}" style="border-radius: ${radius};">
                                ${vmlBtn}${htmlBtn}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    } else if (comp.type === 'footer') {
        let footerLinks: {text: string; url: string}[] = [];
        try { footerLinks = JSON.parse(d.links || '[]'); } catch { footerLinks = []; }
        const isStacked = d.layout === 'stacked';
        const linkColor = d.textColor || '#007aff';
        const separatorColor = d.separatorColor || '#c7c7cc';
        const fontSize = d.fontSize || '12';
        const fontWeight = d.fontWeight || 'normal';
        const fontStyleVal = d.fontStyle || 'normal';
        const textDecor = d.textDecoration || 'none';
        const textAlign = d.textAlign || 'center';
        const spacing = parseInt(d.linkSpacing || '12');
        const bgColor = d.backgroundColor || 'transparent';
        const isTransparentBg = bgColor === 'transparent';
        const sepChar = d.separatorStyle === 'pipe' ? '|' : d.separatorStyle === 'dash' ? '&mdash;' : '&middot;';

        const linkStyle = [
            `color: ${linkColor}`,
            `text-decoration: ${textDecor}`,
            `font-size: ${fontSize}px`,
            `font-weight: ${fontWeight}`,
            `font-style: ${fontStyleVal}`,
            `font-family: ${designSettings.fontFamily}`,
            `line-height: 1.4`,
        ].join(';');

        if (isStacked) {
            const linksHtml = footerLinks.map((link, i) => {
                let html = `<tr><td align="${textAlign}" style="padding: ${i === 0 ? 0 : spacing}px 0 0 0;"><a href="${DOMPurify.sanitize(link.url || '#')}" target="_blank" style="${linkStyle}">${DOMPurify.sanitize(link.text || '')}</a></td></tr>`;
                return html;
            }).join('');

            sectionsHtml += `
                <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                    <td align="${textAlign}" ${!isTransparentBg ? `bgcolor="${bgColor}"` : ''} class="${mobCls}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                        <table border="0" cellspacing="0" cellpadding="0" style="margin: ${textAlign === 'center' ? '0 auto' : '0'};">
                            ${linksHtml}
                        </table>
                    </td>
                </tr>
            `;
        } else {
            const linksHtml = footerLinks.map((link, i) => {
                let html = '';
                if (i > 0) {
                    html += `<td style="padding: 0 ${spacing}px; color: ${separatorColor}; font-size: ${fontSize}px; line-height: 1;">${sepChar}</td>`;
                }
                html += `<td><a href="${DOMPurify.sanitize(link.url || '#')}" target="_blank" style="${linkStyle}">${DOMPurify.sanitize(link.text || '')}</a></td>`;
                return html;
            }).join('');

            sectionsHtml += `
                <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                    <td align="${textAlign}" ${!isTransparentBg ? `bgcolor="${bgColor}"` : ''} class="${mobCls}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                        <table border="0" cellspacing="0" cellpadding="0" style="margin: ${textAlign === 'center' ? '0 auto' : '0'};">
                            <tr>${linksHtml}</tr>
                        </table>
                    </td>
                </tr>
            `;
        }
    } else if (comp.type === 'divider') {
        const { width, thickness, lineColor, alignment, paddingTop, paddingBottom, paddingLeftRight } = d;
        const alignValue = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center';

        sectionsHtml += `
          <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
            <td class="${mobCls}" style="padding: ${paddingTop}px ${paddingLeftRight || '0'}px ${paddingBottom}px ${paddingLeftRight || '0'}px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="${alignValue}">
                    <table role="presentation" width="${width}%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td height="${thickness}" style="height: ${thickness}px; background-color: ${lineColor}; line-height: ${thickness}px; font-size: ${thickness}px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
    } else if (comp.type === 'spacer') {
        const { height, backgroundColor, matchEmailBackground } = d;
        const bgColor = matchEmailBackground === 'true' ? 'transparent' : backgroundColor;
        const bgStyle = bgColor !== 'transparent' ? `background-color: ${bgColor};` : '';
        
        sectionsHtml += `
            <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                <td height="${height}" class="${mobCls}" style="height: ${height}px; line-height: ${height}px; font-size: 0; mso-line-height-rule: exactly; ${bgStyle}">
                    &nbsp;
                </td>
            </tr>
        `;
    } else if (comp.type === 'service_offer') {
        const generateOfferContent = (data: Record<string, string>, suffix = '', imageMaxWidth?: number, renderMode: 'full' | 'imageOnly' | 'contentOnly' = 'full') => {
            let contentBlocks = '';
            // Image
            if (renderMode !== 'contentOnly' && data[`imageUrl${suffix}`]) {
                const imgStyles = `display: block; width: ${imageMaxWidth ? '100%' : `${data[`imageWidth${suffix}`] || '100'}%`}; max-width: ${imageMaxWidth ? `${imageMaxWidth}px` : '100%'}; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;`;
                let imgTag = `<img src="${DOMPurify.sanitize(data[`imageUrl${suffix}`])}" alt="${DOMPurify.sanitize(data[`imageAlt${suffix}`] || '')}" style="${imgStyles}" />`;
                if (data[`imageLink${suffix}`]) {
                    imgTag = `<a href="${DOMPurify.sanitize(data[`imageLink${suffix}`])}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
                }
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`imageAlignment${suffix}`] || 'center'}" style="padding: ${data[`imagePaddingTop${suffix}`] || 10}px 0 ${data[`imagePaddingBottom${suffix}`] || 10}px 0;">${imgTag}</td></tr></table>`;
            }
            if (renderMode === 'imageOnly') return contentBlocks;
            // Title
            if (data[`serviceTitle${suffix}`]) {
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`titleAlignment${suffix}`] || 'center'}" style="padding: ${data[`titlePaddingTop${suffix}`] || 10}px ${data[`titlePaddingLeftRight${suffix}`] || '0'}px ${data[`titlePaddingBottom${suffix}`] || 10}px ${data[`titlePaddingLeftRight${suffix}`] || '0'}px; font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`titleFontSize${suffix}`]}px; font-weight: ${data[`titleFontWeight${suffix}`]}; font-style: ${data[`titleFontStyle${suffix}`] || 'normal'}; color: ${data[`titleTextColor${suffix}`]}; line-height: 1.2;">${DOMPurify.sanitize(data[`serviceTitle${suffix}`])}</td></tr></table>`;
            }
            // Coupon
            if (data[`couponCode${suffix}`]) {
                const couponBorderStyle = data[`couponShowBorder${suffix}`] === 'true' ? `border: 1px ${data[`couponBorderStyle${suffix}`]} ${data[`couponBorderColor${suffix}`]};` : '';
                const couponPaddingLR = data[`couponPaddingLeftRight${suffix}`] || data[`couponPaddingLeft${suffix}`] || '16';
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`couponAlignment${suffix}`] || 'center'}" style="padding: 10px 0;"><table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;"><tr><td align="center" style="font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`couponFontSize${suffix}`]}px; font-weight: ${data[`couponFontWeight${suffix}`]}; font-style: ${data[`couponFontStyle${suffix}`] || 'normal'}; color: ${data[`couponTextColor${suffix}`]}; background-color: ${data[`couponBgColor${suffix}`]}; padding: ${data[`couponPaddingTop${suffix}`]}px ${couponPaddingLR}px ${data[`couponPaddingBottom${suffix}`]}px ${couponPaddingLR}px; ${couponBorderStyle}; line-height: 1.2;">${DOMPurify.sanitize(data[`couponCode${suffix}`])}</td></tr></table></td></tr></table>`;
            }
            // Details
            if (data[`serviceDetails${suffix}`]) {
                const sanitizedDetails = DOMPurify.sanitize(data[`serviceDetails${suffix}`]).replace(/\n/g, '<br>');
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`detailsAlignment${suffix}`] || 'center'}" style="padding: ${data[`detailsPaddingTop${suffix}`] || 12}px ${data[`detailsPaddingLeftRight${suffix}`] || '0'}px ${data[`detailsPaddingBottom${suffix}`] || 12}px ${data[`detailsPaddingLeftRight${suffix}`] || '0'}px; font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`detailsFontSize${suffix}`]}px; font-weight: ${data[`detailsFontWeight${suffix}`] || 'normal'}; font-style: ${data[`detailsFontStyle${suffix}`] || 'normal'}; color: ${data[`detailsTextColor${suffix}`]}; line-height: ${data[`detailsLineHeight${suffix}`]};">${sanitizedDetails}</td></tr></table>`;
            }
            // Button
            if (data[`buttonText${suffix}`]) {
                 const getButtonWidthForHtml = (widthType: string | undefined): string => {
                    switch(widthType) {
                        case 'full': return '100%'; case 'small': return '160px'; case 'medium': return '280px'; case 'large': return '400px'; case 'auto': return 'auto';
                        default: return widthType || 'auto';
                    }
                };
                const buttonWidth = getButtonWidthForHtml(data[`buttonWidth${suffix}`]);
                const btnRadius = `${data[`buttonBorderRadius${suffix}`] || '8'}px`;
                const isOutlined = designSettings.buttonStyle === 'outlined';
                const btnBorderColor = data[`buttonBorderColor${suffix}`] || '';
                const btnBorderWidth = parseInt(data[`buttonBorderWidth${suffix}`] || '0');
                const btnFontWeight = data[`buttonFontWeight${suffix}`] || 'bold';
                const sanitizedButtonLink = DOMPurify.sanitize(data[`buttonLink${suffix}`] || '#');
                const sanitizedButtonText = DOMPurify.sanitize(data[`buttonText${suffix}`]);
                const buttonBgColor = data[`buttonBgColor${suffix}`] || '#0066FF';
                const buttonTextColor = data[`buttonTextColor${suffix}`] || '#FFFFFF';
                const svcBorderCss = btnBorderWidth > 0 ? `border: ${btnBorderWidth}px solid ${btnBorderColor || buttonBgColor}` : (isOutlined ? `border: 2px solid ${buttonBgColor}` : 'border: 0');
                let aStylesList = [`background-color: ${isOutlined ? 'transparent' : buttonBgColor}`,`color: ${isOutlined ? buttonBgColor : buttonTextColor}`,`display: block`,`font-family: ${designSettings.fontFamily}, Arial, sans-serif`,`font-size: ${data[`buttonFontSize${suffix}`] || '16'}px`,`font-weight: ${btnFontWeight}`,`text-decoration: none`,`border-radius: ${btnRadius}`,svcBorderCss,`text-align: center`,`line-height: 1.2`,`box-sizing: border-box`,`-webkit-text-size-adjust: none`,];
                if (buttonWidth === 'auto') aStylesList.push(`padding: ${data[`buttonPaddingTop${suffix}`] || '12'}px ${data[`buttonPaddingLeftRight${suffix}`] || '24'}px ${data[`buttonPaddingBottom${suffix}`] || '12'}px`);
                else aStylesList.push(`padding: ${data[`buttonPaddingTop${suffix}`] || '12'}px 0 ${data[`buttonPaddingBottom${suffix}`] || '12'}px 0`, `width: 100%`);
                const aStyles = aStylesList.join('; ');
                const vmlHeight = (parseInt(data[`buttonPaddingTop${suffix}`] || '12') + parseInt(data[`buttonPaddingBottom${suffix}`] || '12') + parseInt(data[`buttonFontSize${suffix}`] || '16')) * 1.3;
                let vmlWidthStyle = buttonWidth !== 'auto' ? `width:${buttonWidth};` : '';
                const vmlArcSize = `${Math.min(50, (parseInt(btnRadius) / (vmlHeight/2)) * 100)}%`;
                const svcVmlStrokeColor = btnBorderWidth > 0 ? (btnBorderColor || buttonBgColor) : (isOutlined ? buttonBgColor : 'none');
                const svcVmlStrokeWeight = btnBorderWidth > 0 ? `${btnBorderWidth}px` : (isOutlined ? '2px' : '0');
                const vmlButton = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${sanitizedButtonLink}" style="height:${vmlHeight}px;v-text-anchor:middle;${vmlWidthStyle}" arcsize="${vmlArcSize}" strokecolor="${svcVmlStrokeColor}" strokeweight="${svcVmlStrokeWeight}" fillcolor="${isOutlined ? 'transparent' : buttonBgColor}"><w:anchorlock/><center style="color:${isOutlined ? buttonBgColor : buttonTextColor};font-family:Arial,sans-serif;font-size:${data[`buttonFontSize${suffix}`]}px;font-weight:${btnFontWeight};">${sanitizedButtonText}</center></v:roundrect><![endif]-->`;
                const svcBtnClass = buttonWidth === '100%' ? ' class="btn-fluid"' : '';
                const htmlButton = `<!--[if !mso]><!--><a href="${sanitizedButtonLink}" style="${aStyles}"${svcBtnClass} target="_blank">${sanitizedButtonText}</a><!--<![endif]-->`;
                let buttonContent = `${vmlButton}${htmlButton}`;
                if (buttonWidth !== '100%') {
                    const tableWidth = buttonWidth === 'auto' ? 'auto' : buttonWidth;
                    buttonContent = `<table cellpadding="0" cellspacing="0" border="0" style="width: ${tableWidth};"><tr><td align="center">${vmlButton}${htmlButton}</td></tr></table>`;
                }
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`buttonAlignment${suffix}`] || 'center'}" style="padding: 12px 0;">${buttonContent}</td></tr></table>`;
            }
            // Disclaimer
            if (data[`disclaimer${suffix}`]) {
                const sanitizedDisclaimer = DOMPurify.sanitize(data[`disclaimer${suffix}`]).replace(/\n/g, '<br>');
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`disclaimerAlignment${suffix}`] || 'center'}" style="padding: ${data[`disclaimerPaddingTop${suffix}`] || 8}px ${data[`disclaimerPaddingLeftRight${suffix}`] || '0'}px ${data[`disclaimerPaddingBottom${suffix}`] || 8}px ${data[`disclaimerPaddingLeftRight${suffix}`] || '0'}px; font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`disclaimerFontSize${suffix}`]}px; font-weight: ${data[`disclaimerFontWeight${suffix}`] || 'normal'}; font-style: ${data[`disclaimerFontStyle${suffix}`] || 'normal'}; color: ${data[`disclaimerTextColor${suffix}`]}; line-height: 1.4;">${sanitizedDisclaimer}</td></tr></table>`;
            }
            if (renderMode === 'full') {
                const svcCardBorder = data.showBorder !== 'false' ? 'border: 1px solid #e2e8f0; ' : '';
                return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="${svcCardBorder}border-radius: 8px; background-color: #ffffff;"><tr><td style="padding: 15px;">${contentBlocks}</td></tr></table>`;
            }
            return contentBlocks;
        };

        const containerPadding = `padding: ${d.containerPaddingTop}px ${d.containerPaddingRight}px ${d.containerPaddingBottom}px ${d.containerPaddingLeft}px;`;
        const serviceLayout = d.layout === 'single' ? 'center' : (d.layout || 'center');
        let serviceOfferContentHtml = '';

        if (serviceLayout === 'grid') {
            const offer1Html = generateOfferContent(d, '');
            const offer2Html = generateOfferContent(d, '2');
            if (d.mobileReverse === 'true') {
                serviceOfferContentHtml = `
                    <!--[if mso]>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
                    <td width="49%" valign="top" style="width:49%;padding-right:8px;vertical-align:top;">${offer1Html}</td>
                    <td width="49%" valign="top" style="width:49%;padding-left:8px;vertical-align:top;">${offer2Html}</td>
                    </tr></table>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <div class="mobile-reverse" style="display:flex;width:100%;">
                        <div style="width:50%;padding-right:8px;box-sizing:border-box;vertical-align:top;">${offer1Html}</div>
                        <div style="width:50%;padding-left:8px;box-sizing:border-box;vertical-align:top;">${offer2Html}</div>
                    </div>
                    <!--<![endif]-->
                `;
            } else {
                serviceOfferContentHtml = `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-right: 8px; vertical-align: top;">
                                ${offer1Html}
                            </td>
                            <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-left: 8px; vertical-align: top;">
                                ${offer2Html}
                            </td>
                        </tr>
                    </table>
                `;
            }
        } else if (serviceLayout === 'left' || serviceLayout === 'right') {
            const hasImage = !!d.imageUrl;
            if (!hasImage) {
                serviceOfferContentHtml = generateOfferContent(d, '');
            } else {
                const isRightLayout = serviceLayout === 'right';
                const imgColWidth = 180;
                const gutter = 15;
                const imageTd = `<td width="${imgColWidth}" class="mobile-stack mobile-padding-bottom" valign="top" style="width: ${imgColWidth}px; vertical-align: top;">${generateOfferContent(d, '', imgColWidth, 'imageOnly')}</td>`;
                const contentTdLeft = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-left: ${gutter}px;">${generateOfferContent(d, '', undefined, 'contentOnly')}</td>`;
                const contentTdRight = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-right: ${gutter}px;">${generateOfferContent(d, '', undefined, 'contentOnly')}</td>`;
                const svcLRBorder = d.showBorder !== 'false' ? 'border: 1px solid #e2e8f0; ' : '';
                serviceOfferContentHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="${svcLRBorder}border-radius: 8px; background-color: #ffffff;"><tr><td style="padding: 15px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${isRightLayout ? contentTdRight + imageTd : imageTd + contentTdLeft}</tr></table></td></tr></table>`;
            }
        } else {
            serviceOfferContentHtml = generateOfferContent(d, '');
        }

        sectionsHtml += `
            <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                <td align="center" class="${mobCls}" style="${containerPadding}">
                    ${serviceOfferContentHtml}
                </td>
            </tr>
        `;
    } else if (comp.type === 'sales_offer') {
        const renderSalesOfferContent = (data: Record<string, string>, suffix: string, imageMaxWidth?: number, renderMode: 'full' | 'imageOnly' | 'contentOnly' = 'full') => {
            const rawAddOffers = JSON.parse(data[`additionalOffers${suffix}`] || '[]');
            const addOffers = rawAddOffers.map((o: any) => ({
                ...o,
                separator: DOMPurify.sanitize(o.separator || ''),
                offer: DOMPurify.sanitize(o.offer || ''),
                details: DOMPurify.sanitize(o.details || ''),
                disclaimer: DOMPurify.sanitize(o.disclaimer || '')
            }));
            let contentHtml = '';

            const renderField = (options: any) => {
                if (!options.text) return '';
                const { text, fontSize, color, bgColor, fontWeight, fontStyle, textAlign, paddingTop, paddingBottom, paddingLeftRight } = options;
                const padding = `padding: ${paddingTop || 0}px ${paddingLeftRight || 0}px ${paddingBottom || 0}px ${paddingLeftRight || 0}px;`;
                const style = [`font-family: ${designSettings.fontFamily}`,`color: ${color || '#000'}`,`font-size: ${fontSize || 14}px`,`background-color: ${bgColor === 'transparent' ? 'transparent' : bgColor}`,`font-weight: ${fontWeight || 'normal'}`,`font-style: ${fontStyle || 'normal'}`,`text-align: ${textAlign || 'center'}`,padding,`line-height: 1.2`].join(';');
                return `<div style="${style}">${text.replace(/\n/g, '<br>')}</div>`;
            };
            
            if (renderMode !== 'contentOnly' && data[`imageSrc${suffix}`]) {
                const imgStyles = `display: block; width: 100%; max-width: ${imageMaxWidth ? `${imageMaxWidth}px` : '100%'}; height: auto; border: 0; border-radius: 8px; margin: 0 auto 15px;`;
                let imgTag = `<img src="${DOMPurify.sanitize(data[`imageSrc${suffix}`] || '')}" alt="${DOMPurify.sanitize(data[`imageAlt${suffix}`] || 'Sales Offer')}" style="${imgStyles}" border="0" />`;
                if (data[`imageLink${suffix}`]) imgTag = `<a href="${DOMPurify.sanitize(data[`imageLink${suffix}`])}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
                contentHtml += imgTag;
            }

            if (renderMode !== 'imageOnly') {
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`vehicleText${suffix}`]), fontSize: data[`vehicleFontSize${suffix}`], color: data[`vehicleColor${suffix}`], bgColor: data[`vehicleBgColor${suffix}`], fontWeight: 'bold', fontStyle: data[`vehicleFontStyle${suffix}`], textAlign: data[`vehicleTextAlign${suffix}`], paddingTop: data[`vehiclePaddingTop${suffix}`], paddingBottom: data[`vehiclePaddingBottom${suffix}`], paddingLeftRight: data[`vehiclePaddingLeftRight${suffix}`] });
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`mainOfferText${suffix}`]), fontSize: data[`mainOfferFontSize${suffix}`], color: data[`mainOfferColor${suffix}`], bgColor: data[`mainOfferBgColor${suffix}`], fontWeight: '800', fontStyle: data[`mainOfferFontStyle${suffix}`], textAlign: data[`mainOfferTextAlign${suffix}`], paddingTop: data[`mainOfferPaddingTop${suffix}`], paddingBottom: data[`mainOfferPaddingBottom${suffix}`], paddingLeftRight: data[`mainOfferPaddingLeftRight${suffix}`] });
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`detailsText${suffix}`]), fontSize: data[`detailsFontSize${suffix}`], color: data[`detailsColor${suffix}`], bgColor: data[`detailsBgColor${suffix}`], fontWeight: data[`detailsFontWeight${suffix}`], fontStyle: data[`detailsFontStyle${suffix}`], textAlign: data[`detailsTextAlign${suffix}`], paddingTop: data[`detailsPaddingTop${suffix}`], paddingBottom: data[`detailsPaddingBottom${suffix}`], paddingLeftRight: data[`detailsPaddingLeftRight${suffix}`] });

            addOffers.forEach((o: any) => {
                contentHtml += renderField({ text: o.separator, fontSize: o.separatorFontSize, color: o.separatorColor, bgColor: o.separatorBgColor, fontWeight: o.separatorFontWeight, fontStyle: o.separatorFontStyle, textAlign: o.separatorTextAlign, paddingTop: o.separatorPaddingTop, paddingBottom: o.separatorPaddingBottom, paddingLeftRight: o.separatorPaddingLeftRight });
                contentHtml += renderField({ text: o.offer, fontSize: o.offerFontSize, color: o.offerColor, bgColor: o.offerBgColor, fontWeight: o.offerFontWeight, fontStyle: o.offerFontStyle, textAlign: o.offerTextAlign, paddingTop: o.offerPaddingTop, paddingBottom: o.offerPaddingBottom, paddingLeftRight: o.offerPaddingLeftRight });
                contentHtml += renderField({ text: o.details, fontSize: o.detailsFontSize, color: o.detailsColor, bgColor: o.detailsBgColor, fontWeight: o.detailsFontWeight, fontStyle: o.detailsFontStyle, textAlign: o.detailsTextAlign, paddingTop: o.detailsPaddingTop, paddingBottom: o.detailsPaddingBottom, paddingLeftRight: o.detailsPaddingLeftRight });
                contentHtml += renderField({ text: o.disclaimer, fontSize: o.disclaimerFontSize, color: o.disclaimerColor, bgColor: o.disclaimerBgColor, fontWeight: o.disclaimerFontWeight, fontStyle: o.disclaimerFontStyle, textAlign: o.disclaimerTextAlign, paddingTop: o.disclaimerPaddingTop, paddingBottom: o.disclaimerPaddingBottom, paddingLeftRight: o.disclaimerPaddingLeftRight });
            });

            const sanitizedVin = DOMPurify.sanitize(data[`vinValue${suffix}`] || '');
            const finalVinText = sanitizedVin.trim() ? `VIN: ${sanitizedVin.trim()}` : '';
            contentHtml += renderField({ text: finalVinText, fontSize: data[`stockVinFontSize${suffix}`], color: data[`stockVinColor${suffix}`], bgColor: data[`stockVinBgColor${suffix}`], fontWeight: data[`stockVinFontWeight${suffix}`], fontStyle: data[`stockVinFontStyle${suffix}`], textAlign: data[`stockVinTextAlign${suffix}`], paddingTop: data[`stockVinPaddingTop${suffix}`], paddingBottom: data[`stockVinPaddingBottom${suffix}`], paddingLeftRight: data[`stockVinPaddingLeftRight${suffix}`] });

            const sanitizedStock = DOMPurify.sanitize(data[`stockValue${suffix}`] || '');
            const finalStockText = sanitizedStock.trim() ? `Stock #: ${sanitizedStock.trim()}` : '';
            contentHtml += renderField({ text: finalStockText, fontSize: data[`stockVinFontSize${suffix}`], color: data[`stockVinColor${suffix}`], bgColor: data[`stockVinBgColor${suffix}`], fontWeight: data[`stockVinFontWeight${suffix}`], fontStyle: data[`stockVinFontStyle${suffix}`], textAlign: data[`stockVinTextAlign${suffix}`], paddingTop: data[`stockVinPaddingTop${suffix}`], paddingBottom: data[`stockVinPaddingBottom${suffix}`], paddingLeftRight: data[`stockVinPaddingLeftRight${suffix}`] });

            let finalMileageText = '';
            const sanitizedMileage = DOMPurify.sanitize(data[`mileageValue${suffix}`] || '');
            if (sanitizedMileage.trim() !== '') { finalMileageText = `Mileage: ${sanitizedMileage.trim()}`; }
            contentHtml += renderField({ text: finalMileageText, fontSize: data[`mileageFontSize${suffix}`], color: data[`mileageColor${suffix}`], bgColor: data[`mileageBgColor${suffix}`], fontWeight: data[`mileageFontWeight${suffix}`], fontStyle: data[`mileageFontStyle${suffix}`], textAlign: data[`mileageTextAlign${suffix}`], paddingTop: data[`mileagePaddingTop${suffix}`], paddingBottom: data[`mileagePaddingBottom${suffix}`], paddingLeftRight: data[`mileagePaddingLeftRight${suffix}`] });

            const radius = `${data[`btnBorderRadius${suffix}`] || '8'}px`;
            const isOutlined = designSettings.buttonStyle === 'outlined';
            const salesBorderColor = data[`btnBorderColor${suffix}`] || '';
            const salesBorderWidth = parseInt(data[`btnBorderWidth${suffix}`] || '0');
            const salesFontWeight = data[`btnFontWeight${suffix}`] || 'bold';
            const btnBgColor = data[`btnColor${suffix}`] || '#007aff';
            const btnTextColor = data[`btnTextColor${suffix}`] || '#ffffff';
            const btnAlign = data[`btnAlign${suffix}`] || 'center';
            let btnTableWidthAttr = "100%";
            const btnWidthType = data[`btnWidthType${suffix}`] || 'full';
            if (btnWidthType === 'auto') btnTableWidthAttr = "";
            else if (btnWidthType === 'small') btnTableWidthAttr = "160";
            else if (btnWidthType === 'medium') btnTableWidthAttr = "280";
            else if (btnWidthType === 'large') btnTableWidthAttr = "400";
            let btnMargin = '12px 0 0 0';
            if (btnAlign === 'center') btnMargin = '12px auto 0';
            else if (btnAlign === 'right') btnMargin = '12px 0 0 auto';
            const salesBorderCss = salesBorderWidth > 0 ? `border: ${salesBorderWidth}px solid ${salesBorderColor || btnBgColor}` : (isOutlined ? `border: 2px solid ${btnBgColor}` : 'border: 0');
            const btnStyles = [`background-color: ${isOutlined ? 'transparent' : btnBgColor}`,`color: ${isOutlined ? btnBgColor : btnTextColor}`,`padding: ${data[`btnPaddingTop${suffix}`] || '12'}px ${data[`btnPaddingLeftRight${suffix}`] || '20'}px ${data[`btnPaddingBottom${suffix}`] || '12'}px`,`text-decoration: none`,`display: block`,`font-weight: ${salesFontWeight}`,`border-radius: ${radius}`,`font-size: ${data[`btnFontSize${suffix}`] || 16}px`,`font-family: ${designSettings.fontFamily}`,`text-align: center`,salesBorderCss].join('; ');
            const sanitizedBtnLink = DOMPurify.sanitize(data[`btnLink${suffix}`] || '#');
            const sanitizedBtnText = DOMPurify.sanitize(data[`btnText${suffix}`] || 'View');
            const salesVmlHeight = (parseInt(data[`btnPaddingTop${suffix}`] || '12') + parseInt(data[`btnPaddingBottom${suffix}`] || '12') + parseInt(data[`btnFontSize${suffix}`] || '16')) * 1.3;
            const salesBtnWidthStyle = btnWidthType === 'full' ? '100%' : (btnTableWidthAttr ? btnTableWidthAttr+'px' : 'auto');
            const salesVmlWidthStyle = btnWidthType !== 'auto' ? `width:${salesBtnWidthStyle};` : '';
            const salesVmlArcSize = `${Math.min(50, (parseInt(radius) / (salesVmlHeight / 2)) * 100)}%`;
            const salesVmlStrokeColor = salesBorderWidth > 0 ? (salesBorderColor || btnBgColor) : (isOutlined ? btnBgColor : 'none');
            const salesVmlStrokeWeight = salesBorderWidth > 0 ? `${salesBorderWidth}px` : (isOutlined ? '2px' : '0');
            const salesVmlBtn = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${sanitizedBtnLink}" style="height:${salesVmlHeight}px;v-text-anchor:middle;${salesVmlWidthStyle}" arcsize="${salesVmlArcSize}" strokecolor="${salesVmlStrokeColor}" strokeweight="${salesVmlStrokeWeight}" fillcolor="${isOutlined ? 'transparent' : btnBgColor}"><w:anchorlock/><center style="color:${isOutlined ? btnBgColor : btnTextColor};font-family:Arial,sans-serif;font-size:${data[`btnFontSize${suffix}`] || 16}px;font-weight:${salesFontWeight};">${sanitizedBtnText}</center></v:roundrect><![endif]-->`;
            const salesBtnClass = btnWidthType === 'full' ? ' class="btn-fluid"' : '';
            const salesHtmlBtn = `<!--[if !mso]><!--><a href="${sanitizedBtnLink}" target="_blank" style="${btnStyles}"${salesBtnClass}>${sanitizedBtnText}</a><!--<![endif]-->`;
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`disclaimerText${suffix}`]), fontSize: data[`disclaimerFontSize${suffix}`], color: data[`disclaimerColor${suffix}`], bgColor: data[`disclaimerBgColor${suffix}`], fontWeight: data[`disclaimerFontWeight${suffix}`], fontStyle: data[`disclaimerFontStyle${suffix}`], textAlign: data[`disclaimerTextAlign${suffix}`], paddingTop: data[`disclaimerPaddingTop${suffix}`], paddingBottom: data[`disclaimerPaddingBottom${suffix}`], paddingLeftRight: data[`disclaimerPaddingLeftRight${suffix}`] });
            contentHtml += `<table border="0" cellspacing="0" cellpadding="0" ${btnTableWidthAttr ? `width="${btnTableWidthAttr}"` : ""} style="margin: ${btnMargin}; width: ${salesBtnWidthStyle}; max-width: 100%;"><tr><td align="center" bgcolor="${isOutlined ? 'transparent' : btnBgColor}" style="border-radius: ${radius};">${salesVmlBtn}${salesHtmlBtn}</td></tr></table>`;
            } // end renderMode !== 'imageOnly'

            return contentHtml;
        };
        
        const layout = d.layout || 'center';
        let offerContentHtml = '';

        if (layout === 'grid') {
            const offer1Content = renderSalesOfferContent(d, '', 250);
            const offer2Content = renderSalesOfferContent(d, '2', 250);
            const salesGridBorder = d.showBorder !== 'false' ? 'border: 1px solid #e2e8f0; ' : '';
            const col1Inner = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; ${salesGridBorder}border-radius: 8px;"><tr><td style="padding: 15px;">${offer1Content}</td></tr></table>`;
            const col2Inner = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; ${salesGridBorder}border-radius: 8px;"><tr><td style="padding: 15px;">${offer2Content}</td></tr></table>`;
            if (d.mobileReverse === 'true') {
                offerContentHtml = `
                    <!--[if mso]>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr>
                    <td width="49%" valign="top" style="width:49%;padding-right:8px;vertical-align:top;">${col1Inner}</td>
                    <td width="49%" valign="top" style="width:49%;padding-left:8px;vertical-align:top;">${col2Inner}</td>
                    </tr></tbody></table>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <div class="mobile-reverse" style="display:flex;width:100%;">
                        <div style="width:50%;padding-right:8px;box-sizing:border-box;vertical-align:top;">${col1Inner}</div>
                        <div style="width:50%;padding-left:8px;box-sizing:border-box;vertical-align:top;">${col2Inner}</div>
                    </div>
                    <!--<![endif]-->
                `;
            } else {
                offerContentHtml = `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tbody>
                            <tr>
                                <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-right: 8px; vertical-align: top;">${col1Inner}</td>
                                <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-left: 8px; vertical-align: top;">${col2Inner}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            }
        } else { // Handle single column layouts
            const salesSingleBorder = d.showBorder !== 'false' ? 'border: 1px solid #e2e8f0; ' : '';
            const hasImage = !!d.imageSrc;
            if (!hasImage) {
                offerContentHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="${salesSingleBorder}border-radius: 8px; background-color: #ffffff;"><tr><td style="padding: 15px;">${renderSalesOfferContent(d, '')}</td></tr></table>`;
            } else if (layout === 'center') {
                offerContentHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="${salesSingleBorder}border-radius: 8px; background-color: #ffffff;"><tr><td style="padding: 15px;">${renderSalesOfferContent(d, '')}</td></tr></table>`;
            } else {
                const isRightLayout = layout === 'right';
                const imgColWidth = 180;
                const gutter = 15;
                const imageTd = `<td width="${imgColWidth}" class="mobile-stack mobile-padding-bottom" valign="top" style="width: ${imgColWidth}px; vertical-align: top;">${renderSalesOfferContent(d, '', imgColWidth, 'imageOnly')}</td>`;
                const contentTdLeft = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-left: ${gutter}px;">${renderSalesOfferContent(d, '', undefined, 'contentOnly')}</td>`;
                const contentTdRight = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-right: ${gutter}px;">${renderSalesOfferContent(d, '', undefined, 'contentOnly')}</td>`;
                offerContentHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="${salesSingleBorder}border-radius: 8px; background-color: #ffffff;"><tr><td style="padding: 15px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${isRightLayout ? contentTdRight + imageTd : imageTd + contentTdLeft}</tr></table></td></tr></table>`;
            }
        }

        sectionsHtml += `
            <tr${hideRowClass ? ` class="${hideRowClass}"` : ''}>
                <td bgcolor="${d.backgroundColor || 'transparent'}" class="${mobCls}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    ${offerContentHtml}
                </td>
            </tr>
        `;
    }
  });

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Email</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, a { font-family: Arial, sans-serif !important; }
        table { border-collapse: collapse; }
        .email-container { width: 600px !important; }
    </style>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles */
        body, table, td, a { 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
        }
        table, td { 
            mso-table-lspace: 0pt; 
            mso-table-rspace: 0pt; 
        }
        img { 
            -ms-interpolation-mode: bicubic; 
            border: 0; 
            height: auto; 
            line-height: 100%; 
            outline: none; 
            text-decoration: none; 
        }
        
        /* Body reset */
        body { 
            height: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            background-color: #f5f5f7;
            font-family: Arial, sans-serif;
        }
        
        /* Remove spaces around email on mobile */
        body, #bodyTable {
            height: 100% !important;
            margin: 0;
            padding: 0;
            width: 100% !important;
        }
        
        /* Force Outlook to provide a "view in browser" link */
        #outlook a { padding: 0; }
        
        /* Prevent Webkit and Windows Mobile from changing font sizes */
        body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        
        /* Force Hotmail to display normal line spacing */
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
            line-height: 100%;
        }
        
        /* Mobile column reverse: flex row on desktop, reversed column on mobile */
        .mobile-reverse { display: flex; flex-direction: row; }
        .mobile-reverse > div { box-sizing: border-box; }

        /* Mobile responsive styles */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: auto !important;
            }
            .mobile-stack {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
            }
            .mobile-stack:not(:last-child) {
                padding-bottom: 20px !important;
            }
            .mobile-stack-spacer {
                display: none !important;
            }
            .btn-fluid {
                width: 100% !important;
                display: block !important;
                box-sizing: border-box !important;
            }
            /* Responsive images */
            .responsive-img {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
            }
            /* Mobile font size minimums (prevent tiny text) */
            .mobile-text {
                font-size: 16px !important;
                line-height: 1.4 !important;
            }
            /* Mobile-friendly button sizing */
            .mobile-btn {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 14px 20px !important;
                font-size: 18px !important;
            }
            /* Hide on mobile utility */
            .hide-mobile { display: none !important; }
            /* Show only on mobile utility */
            .show-mobile { display: block !important; }
            /* Mobile padding adjustments */
            .mobile-pad { padding-left: 16px !important; padding-right: 16px !important; }
            /* Mobile text alignment */
            .mobile-center { text-align: center !important; }
            /* Reverse column order on mobile */
            .mobile-reverse { flex-direction: column-reverse !important; }
            .mobile-reverse > div { width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
            /* Per-component mobile overrides */
            ${mobileOverrideCss}
        }
    </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f5f5f7;">
    ${designSettings.preheaderText ? `<!-- Preheader text -->
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${DOMPurify.sanitize(designSettings.preheaderText)}</div>
    <div style="display:none;max-height:0px;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}
    <!-- 100% background wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" id="bodyTable" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f7;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 15px 0; border-collapse: collapse;">
                
                <!-- Centering wrapper for Outlook -->
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width: 600px;">
                <tr>
                <td align="center" valign="top" width="600" style="width: 600px;">
                <![endif]-->
                
                <!-- 600px container -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden;">
                    
                    ${sectionsHtml || '<tr><td style="padding: 30px; text-align: center; font-family: sans-serif;">No content added yet.</td></tr>'}
                    
                </table>
                
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
                
            </td>
        </tr>
    </table>
</body>
</html>`.trim();
}

emailForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();

    if (activeComponents.length === 0) {
        showToast('Please add at least one section before generating.', 'info');
        return;
    }

    const btnText = generateBtn.querySelector('.btn-text') as HTMLElement;
    const spinner = generateBtn.querySelector('.spinner') as HTMLElement;
    const checkmark = generateBtn.querySelector('.checkmark') as HTMLElement;

    if (!btnText || !spinner || !checkmark) return;

    const formElements = Array.from(emailForm.querySelectorAll('input, textarea, select, button'));
    formElements.forEach(el => (el as HTMLButtonElement).disabled = true);

    btnText.textContent = 'Generating...';
    spinner.classList.remove('hidden');
    checkmark.classList.add('hidden');

    // Show skeleton loading in preview area
    outputPlaceholder.style.display = 'none';
    outputContainer.style.display = 'grid';
    const previewContainer = outputContainer.querySelector('.preview-container') as HTMLElement;
    if (previewPane) previewPane.style.display = 'none';
    const skeletonEl = document.createElement('div');
    skeletonEl.className = 'skeleton-preview';
    skeletonEl.innerHTML = `
        <div class="skeleton skeleton-header"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-button"></div>
        <div class="skeleton skeleton-footer"></div>
    `;
    if (previewContainer) previewContainer.appendChild(skeletonEl);

    setTimeout(() => {
        try {
            const html = generateEmailHtml();
            const codeBlock = document.getElementById('code-block') as HTMLElement;
            if (codeBlock) codeBlock.textContent = html;
            if (previewPane) {
                previewPane.srcdoc = html;
                previewPane.style.display = '';
            }

            // Remove skeleton
            skeletonEl.remove();

            spinner.classList.add('hidden');
            checkmark.classList.remove('hidden');
            btnText.textContent = 'Complete';
            showToast('Template Generated', 'success');

        } catch (err) {
            console.error("Generation failed:", err);
            showToast('Error generating template. Check console for details.', 'error');
            spinner.classList.add('hidden');
            btnText.textContent = 'Generate Template';
            skeletonEl.remove();
            if (previewPane) previewPane.style.display = '';
        } finally {
            setTimeout(() => {
                formElements.forEach(el => (el as HTMLButtonElement).disabled = false);
                checkmark.classList.add('hidden');
                btnText.textContent = 'Generate Template';
            }, 2000);
        }
    }, 600);
});

copyBtn?.addEventListener('click', async () => {
  try {
    const html = generateEmailHtml().replace(/[ \t]*<title>Email<\/title>\n?/g, '');
    await navigator.clipboard.writeText(html);
    showToast('Copied to clipboard', 'success');
  } catch (err) { console.error(err); }
});

downloadBtn?.addEventListener('click', () => {
    const html = generateEmailHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email_template_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('HTML file downloaded', 'success');
});

downloadPdfBtn?.addEventListener('click', () => {
    const html = generateEmailHtml();
    const printHtml = html.replace(
        '</head>',
        `<style>@media print { @page { margin: 0; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head>`
    );
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Pop-ups blocked — please allow pop-ups and try again', 'error');
        return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
    showToast('PDF download dialog opened', 'success');
});

// --- Dealership Groups ---

const getDealershipGroups = (): DealershipGroup[] => {
    try {
        const data = localStorage.getItem(LS_DEALERSHIPS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load dealership groups', e);
        return [];
    }
};

const saveDealershipGroupsToStorage = (groups: DealershipGroup[]) => {
    localStorage.setItem(LS_DEALERSHIPS_KEY, JSON.stringify(groups));
};

const setActiveDealership = (id: string | null) => {
    // Save current draft before switching
    persistDraft();

    activeDealershipId = id;
    try {
        if (id) {
            localStorage.setItem(LS_ACTIVE_DEALERSHIP_KEY, id);
        } else {
            localStorage.removeItem(LS_ACTIVE_DEALERSHIP_KEY);
        }
    } catch (e) {
        console.error('Failed to persist active dealership', e);
    }

    // Load draft for the new dealership context
    const hasDraft = (() => {
        try {
            const data = localStorage.getItem(getDraftKey());
            if (!data) return false;
            const draft = JSON.parse(data);
            return !!(draft && draft.designSettings && Array.isArray(draft.activeComponents));
        } catch { return false; }
    })();

    if (hasDraft) {
        loadDraft();
    } else {
        // No saved draft — start fresh, applying this dealership's default scheme
        activeComponents = [];
        selectedComponentId = null;
        collapsedStates = {};
        if (id) {
            const groups = getDealershipGroups();
            const group = groups.find(g => g.id === id);
            if (group) {
                designSettings = {
                    ...designSettings,
                    globalBodyColor: group.defaultBodyColor,
                    globalLinkColor: group.defaultAccentColor,
                    colorScheme: group.defaultColorSchemeId ?? 'custom',
                    ...(group.defaultFontFamily ? { fontFamily: group.defaultFontFamily } : {}),
                    ...(group.defaultButtonStyle ? { buttonStyle: group.defaultButtonStyle as DesignSettings['buttonStyle'] } : {}),
                };
                if (fontSelect) fontSelect.value = designSettings.fontFamily;
                if (preheaderInput) { preheaderInput.value = designSettings.preheaderText || ''; updatePreheaderCounter(); }
                syncGlobalTextStylesUI();
            }
        }
        renderComponents();
        saveDraft();
        saveToHistory();
    }

    renderDealershipBanner();
    renderSavedTemplates();
    renderComponentLibrary();
    triggerPreviewUpdate();
};

const renderDealershipBanner = () => {
    const container = document.getElementById('dealership-banner-container');
    if (!container) return;

    const groups = getDealershipGroups();
    const active = activeDealershipId ? groups.find(g => g.id === activeDealershipId) : null;

    if (active) {
        container.innerHTML = `
            <button type="button" class="dealership-banner dealership-banner--active" id="open-dealership-manager">
                <span class="dealership-banner-dot" style="background:${active.defaultAccentColor};"></span>
                <span class="dealership-banner-name">${active.name}</span>
                <span class="material-symbols-rounded dealership-banner-chevron">expand_more</span>
            </button>`;
    } else {
        container.innerHTML = `
            <button type="button" class="dealership-banner dealership-banner--empty" id="open-dealership-manager">
                <span class="material-symbols-rounded" style="font-size:15px;">add_business</span>
                <span>Select or Create Dealership</span>
                <span class="material-symbols-rounded dealership-banner-chevron">expand_more</span>
            </button>`;
    }

    document.getElementById('open-dealership-manager')?.addEventListener('click', openDealershipManager);
};

const openDealershipManager = () => {
    const overlay = document.getElementById('dealership-modal');
    if (!overlay) return;
    renderDealershipList();
    overlay.classList.add('open');
};

const closeDealershipManager = () => {
    const overlay = document.getElementById('dealership-modal');
    overlay?.classList.remove('open');
};

const renderDealershipList = () => {
    const body = document.getElementById('dealership-modal-body');
    if (!body) return;
    const groups = getDealershipGroups();
    const allTemplates = getSavedTemplates();
    const allLibrary = getSavedLibraryComponents();

    const groupCards = groups.map(g => {
        const tplCount = allTemplates.filter(t => t.dealershipId === g.id).length;
        const libCount = allLibrary.filter(l => l.dealershipId === g.id).length;
        const isActive = activeDealershipId === g.id;
        return `
        <div class="dealership-card ${isActive ? 'dealership-card--active' : ''}">
            <div class="dealership-card-left">
                <div class="dealership-card-swatches">
                    <div class="dealership-swatch" style="background:${g.defaultBodyColor};" title="Background"></div>
                    <div class="dealership-swatch" style="background:${g.defaultAccentColor};" title="Accent"></div>
                </div>
                <div class="dealership-card-info">
                    <span class="dealership-card-name">${g.name}</span>
                    <span class="dealership-card-meta">${tplCount} template${tplCount !== 1 ? 's' : ''} · ${libCount} component${libCount !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="dealership-card-actions">
                ${isActive
                    ? `<span class="dealership-active-badge" title="Active"><span class="material-symbols-rounded">task_alt</span></span>`
                    : `<button class="btn btn-primary btn-sm open-dealership-btn" data-id="${g.id}" title="Open"><span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span></button>`
                }
                <button class="btn btn-ghost btn-sm edit-dealership-btn" data-id="${g.id}">
                    <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm del-dealership-btn" data-id="${g.id}" style="color:var(--destructive);">
                    <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');

    const globalTplCount = allTemplates.filter(t => !t.dealershipId).length;
    const globalLibCount = allLibrary.filter(l => !l.dealershipId).length;
    const globalIsActive = !activeDealershipId;

    body.innerHTML = `
        <div class="dealership-list-section">
            <button type="button" class="btn btn-secondary w-full" id="show-create-dealership-form">
                <span class="material-symbols-rounded" style="font-size:16px;">add</span>
                New Dealership Group
            </button>
            <!-- Global option -->
            <div class="dealership-card ${globalIsActive ? 'dealership-card--active' : ''}" style="margin-top:var(--spacing-md);">
                <div class="dealership-card-left">
                    <div class="dealership-card-swatches" style="background:var(--background-secondary);border-radius:var(--radius-sm);width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:16px;color:var(--label-secondary);">public</span>
                    </div>
                    <div class="dealership-card-info">
                        <span class="dealership-card-name">Global</span>
                        <span class="dealership-card-meta">${globalTplCount} template${globalTplCount !== 1 ? 's' : ''} · ${globalLibCount} component${globalLibCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="dealership-card-actions">
                    ${globalIsActive
                        ? `<span class="dealership-active-badge" title="Active"><span class="material-symbols-rounded">task_alt</span></span>`
                        : `<button class="btn btn-primary btn-sm" id="open-global-btn" title="Open"><span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span></button>`
                    }
                </div>
            </div>
            ${groups.length === 0
                ? `<p class="text-sm" style="color:var(--label-secondary);text-align:center;margin-top:var(--spacing-lg);">No dealership groups yet. Create one to get started.</p>`
                : `<div class="dealership-card-list">${groupCards}</div>`
            }
        </div>`;

    body.querySelector('#open-global-btn')?.addEventListener('click', () => {
        setActiveDealership(null);
        closeDealershipManager();
        showToast('Switched to Global', 'success');
    });

    body.querySelector('#show-create-dealership-form')?.addEventListener('click', () => showDealershipForm());

    body.querySelectorAll('.open-dealership-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset.id!;
            setActiveDealership(id);
            closeDealershipManager();
            showToast(`Opened: ${getDealershipGroups().find(g => g.id === id)?.name}`, 'success');
        });
    });

    body.querySelectorAll('.edit-dealership-btn').forEach(btn => {
        btn.addEventListener('click', () => showDealershipForm((btn as HTMLElement).dataset.id));
    });

    body.querySelectorAll('.del-dealership-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset.id!;
            const groups = getDealershipGroups();
            const group = groups.find(g => g.id === id);
            if (!group) return;
            const updated = groups.filter(g => g.id !== id);
            saveDealershipGroupsToStorage(updated);
            if (activeDealershipId === id) {
                setActiveDealership(null);
            }
            renderDealershipList();
            showToast(`Deleted: ${group.name}`, 'success');
        });
    });
};

const showDealershipForm = (editId?: string) => {
    const body = document.getElementById('dealership-modal-body');
    if (!body) return;

    const groups = getDealershipGroups();
    const existing = editId ? groups.find(g => g.id === editId) : null;
    const defaultBodyColor = existing?.defaultBodyColor ?? '#1d1d1f';
    const defaultAccentColor = existing?.defaultAccentColor ?? '#007aff';
    const activeSchemeId = existing?.defaultColorSchemeId ?? 'classic';

    const schemeCards = COLOR_SCHEMES.map(scheme => {
        const isSelected = existing
            ? existing.defaultColorSchemeId === scheme.id
            : scheme.id === 'classic';
        return `
            <div class="color-scheme-card${isSelected ? ' selected' : ''} dealership-scheme-card"
                 data-scheme-id="${scheme.id}"
                 data-body-color="${scheme.bodyColor}"
                 data-accent-color="${scheme.accentColor}"
                 data-tooltip="${scheme.name}">
                <div class="scheme-swatches">
                    <div class="scheme-swatch" style="background:${scheme.bodyColor};"></div>
                    <div class="scheme-swatch" style="background:${scheme.accentColor};"></div>
                </div>
            </div>`;
    }).join('');

    body.innerHTML = `
        <div class="dealership-form-section">
            <button type="button" class="btn btn-ghost btn-sm" id="back-to-dealership-list" style="margin-bottom:var(--spacing-md);">
                <span class="material-symbols-rounded" style="font-size:15px;">arrow_back</span>
                Back
            </button>
            <h4 style="margin-bottom:var(--spacing-md);">${existing ? 'Edit Dealership' : 'New Dealership Group'}</h4>
            <div class="form-group">
                <label class="form-label">Dealership Name</label>
                <input type="text" id="dealership-name-input" class="form-control" placeholder="e.g. Honda of Springfield" value="${existing?.name ?? ''}">
            </div>
            <div class="form-group" style="margin-top:var(--spacing-md);">
                <label class="form-label">Default Color Scheme</label>
                <div class="color-scheme-grid dealership-scheme-grid" id="dealership-scheme-grid">
                    ${schemeCards}
                </div>
                <div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-sm);align-items:center;">
                    <label class="form-label" style="margin:0;white-space:nowrap;">Custom:</label>
                    <div class="color-input-container mini" id="d-body-picker-wrap" onclick="this.querySelector('input').click()">
                        <div class="color-swatch-display" id="d-body-swatch" style="background-color:${defaultBodyColor};"></div>
                        <input type="color" class="color-input-hidden" id="d-body-color" value="${defaultBodyColor}">
                    </div>
                    <div class="color-input-container mini" id="d-accent-picker-wrap" onclick="this.querySelector('input').click()">
                        <div class="color-swatch-display" id="d-accent-swatch" style="background-color:${defaultAccentColor};"></div>
                        <input type="color" class="color-input-hidden" id="d-accent-color" value="${defaultAccentColor}">
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-lg);">
                <button type="button" class="btn btn-primary flex-1" id="save-dealership-btn">${existing ? 'Save Changes' : 'Create Group'}</button>
                <button type="button" class="btn btn-secondary" id="cancel-dealership-form">Cancel</button>
            </div>
        </div>`;

    // Track selected scheme
    let selectedSchemeId: string = activeSchemeId;
    let selectedBodyColor = defaultBodyColor;
    let selectedAccentColor = defaultAccentColor;

    const grid = body.querySelector('#dealership-scheme-grid')!;
    grid.addEventListener('click', (e) => {
        const card = (e.target as Element).closest('.dealership-scheme-card') as HTMLElement | null;
        if (!card) return;
        selectedSchemeId = card.dataset.schemeId!;
        selectedBodyColor = card.dataset.bodyColor!;
        selectedAccentColor = card.dataset.accentColor!;
        // Update color pickers visually
        const bodySwatch = body.querySelector('#d-body-swatch') as HTMLElement | null;
        const accentSwatch = body.querySelector('#d-accent-swatch') as HTMLElement | null;
        const bodyInput = body.querySelector('#d-body-color') as HTMLInputElement | null;
        const accentInput = body.querySelector('#d-accent-color') as HTMLInputElement | null;
        if (bodySwatch) bodySwatch.style.backgroundColor = selectedBodyColor;
        if (accentSwatch) accentSwatch.style.backgroundColor = selectedAccentColor;
        if (bodyInput) bodyInput.value = selectedBodyColor;
        if (accentInput) accentInput.value = selectedAccentColor;
        grid.querySelectorAll('.dealership-scheme-card').forEach(c => c.classList.toggle('selected', c === card));
    });

    const bodyColorInput = body.querySelector('#d-body-color') as HTMLInputElement | null;
    const accentColorInput = body.querySelector('#d-accent-color') as HTMLInputElement | null;

    bodyColorInput?.addEventListener('input', () => {
        selectedSchemeId = 'custom';
        selectedBodyColor = bodyColorInput.value;
        const swatch = body.querySelector('#d-body-swatch') as HTMLElement | null;
        if (swatch) swatch.style.backgroundColor = selectedBodyColor;
        grid.querySelectorAll('.dealership-scheme-card').forEach(c => c.classList.remove('selected'));
    });

    accentColorInput?.addEventListener('input', () => {
        selectedSchemeId = 'custom';
        selectedAccentColor = accentColorInput.value;
        const swatch = body.querySelector('#d-accent-swatch') as HTMLElement | null;
        if (swatch) swatch.style.backgroundColor = selectedAccentColor;
        grid.querySelectorAll('.dealership-scheme-card').forEach(c => c.classList.remove('selected'));
    });

    body.querySelector('#save-dealership-btn')?.addEventListener('click', () => {
        const nameInput = body.querySelector('#dealership-name-input') as HTMLInputElement;
        const name = nameInput?.value.trim();
        if (!name) { showToast('Please enter a dealership name', 'error'); return; }

        const allGroups = getDealershipGroups();
        if (existing) {
            const idx = allGroups.findIndex(g => g.id === existing.id);
            if (idx >= 0) {
                allGroups[idx] = { ...allGroups[idx], name, defaultBodyColor: selectedBodyColor, defaultAccentColor: selectedAccentColor, defaultColorSchemeId: selectedSchemeId };
            }
            saveDealershipGroupsToStorage(allGroups);
            // If this is the active dealership, re-render banner
            if (activeDealershipId === existing.id) renderDealershipBanner();
            showToast(`Updated: ${name}`, 'success');
        } else {
            const newGroup: DealershipGroup = {
                id: Date.now().toString(),
                name,
                defaultBodyColor: selectedBodyColor,
                defaultAccentColor: selectedAccentColor,
                defaultColorSchemeId: selectedSchemeId,
                createdAt: new Date().toISOString(),
            };
            allGroups.unshift(newGroup);
            saveDealershipGroupsToStorage(allGroups);
            showToast(`Created: ${name}`, 'success');
        }
        renderDealershipList();
    });

    body.querySelector('#back-to-dealership-list')?.addEventListener('click', renderDealershipList);
    body.querySelector('#cancel-dealership-form')?.addEventListener('click', renderDealershipList);
};

// --- Dealership Assignment Helpers ---

/** Renders clickable assignment options (Global + all dealerships) inside `containerId`. */
const renderSaveAssignList = (containerId: string, selectedId: string | null | undefined) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const groups = getDealershipGroups();
    const effective = selectedId === undefined ? activeDealershipId : selectedId;

    const globalActive = !effective;
    const items = [
        { id: null as string | null, label: 'Global', meta: 'Available in all dealerships', icon: 'public', accent: '' },
        ...groups.map(g => ({ id: g.id, label: g.name, meta: g.defaultColorSchemeId ? `${g.defaultColorSchemeId} scheme` : '', icon: '', accent: g.defaultAccentColor })),
    ];

    container.innerHTML = items.map(item => {
        const isSelected = item.id === null ? globalActive : item.id === effective;
        const dotHtml = item.icon
            ? `<span class="material-symbols-rounded" style="font-size:15px;color:var(--label-secondary);">${item.icon}</span>`
            : `<span class="save-assign-dot" style="background:${item.accent};"></span>`;
        return `
        <div class="save-assign-item ${isSelected ? 'save-assign-item--selected' : ''}" data-assign-id="${item.id ?? ''}">
            ${dotHtml}
            <div class="save-assign-info">
                <span class="save-assign-name">${item.label}</span>
                ${item.meta ? `<span class="save-assign-meta">${item.meta}</span>` : ''}
            </div>
            ${isSelected ? '<span class="material-symbols-rounded save-assign-check">check</span>' : ''}
        </div>`;
    }).join('');

    container.querySelectorAll('.save-assign-item').forEach(el => {
        el.addEventListener('click', () => {
            container.querySelectorAll('.save-assign-item').forEach(e => {
                e.classList.remove('save-assign-item--selected');
                e.querySelector('.save-assign-check')?.remove();
            });
            el.classList.add('save-assign-item--selected');
            const check = document.createElement('span');
            check.className = 'material-symbols-rounded save-assign-check';
            check.textContent = 'check';
            el.appendChild(check);
        });
    });
};

const getAssignListSelection = (containerId: string): string | null => {
    const container = document.getElementById(containerId);
    const selected = container?.querySelector('.save-assign-item--selected') as HTMLElement | null;
    if (!selected) return activeDealershipId;
    const raw = selected.dataset.assignId ?? '';
    return raw === '' ? null : raw;
};

/** Floating assignment dropdown for "Move to" on existing cards. */
const showAssignmentDropdown = (anchor: HTMLElement, currentId: string | null | undefined, onSelect: (id: string | null) => void) => {
    document.getElementById('assignment-dropdown')?.remove();
    const groups = getDealershipGroups();
    const dropdown = document.createElement('div');
    dropdown.id = 'assignment-dropdown';
    dropdown.className = 'assignment-dropdown';

    const items = [
        { id: null as string | null, label: 'Global', icon: 'public', accent: '' },
        ...groups.map(g => ({ id: g.id, label: g.name, icon: '', accent: g.defaultAccentColor })),
    ];

    dropdown.innerHTML = `
        <div class="assignment-dropdown-title">Move to</div>
        ${items.map(item => {
            const active = item.id === (currentId ?? null);
            const dot = item.icon
                ? `<span class="material-symbols-rounded" style="font-size:13px;color:var(--label-secondary);">${item.icon}</span>`
                : `<span style="width:10px;height:10px;border-radius:50%;background:${item.accent};flex-shrink:0;display:inline-block;"></span>`;
            return `
            <button class="assignment-dropdown-item${active ? ' active' : ''}" data-assign-id="${item.id ?? ''}">
                ${dot}
                <span>${item.label}</span>
                ${active ? '<span class="material-symbols-rounded" style="font-size:13px;margin-left:auto;">check</span>' : ''}
            </button>`;
        }).join('')}
    `;

    document.body.appendChild(dropdown);

    const rect = anchor.getBoundingClientRect();
    const dropW = 180;
    let left = rect.right - dropW;
    let top = rect.bottom + 4;
    if (left < 8) left = 8;
    if (top + 200 > window.innerHeight) top = rect.top - 204;
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.width = `${dropW}px`;
    dropdown.style.zIndex = '9999';

    dropdown.querySelectorAll('.assignment-dropdown-item').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const raw = (btn as HTMLElement).dataset.assignId ?? '';
            onSelect(raw === '' ? null : raw);
            dropdown.remove();
        });
    });

    const closeHandler = (e: Event) => {
        if (!dropdown.contains(e.target as Node)) {
            dropdown.remove();
            document.removeEventListener('click', closeHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
};

const reassignTemplate = (templateId: string, newDealershipId: string | null) => {
    const all = getSavedTemplates();
    const idx = all.findIndex(t => t.id === templateId);
    if (idx < 0) return;
    if (newDealershipId) {
        all[idx] = { ...all[idx], dealershipId: newDealershipId };
    } else {
        const { dealershipId: _, ...rest } = all[idx];
        all[idx] = rest as SavedTemplate;
    }
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(all));
    renderSavedTemplates();
    const dest = newDealershipId ? getDealershipGroups().find(g => g.id === newDealershipId)?.name : 'Global';
    showToast(`Moved to ${dest}`, 'success');
};

const reassignLibraryComponent = (compId: string, newDealershipId: string | null) => {
    const all = getSavedLibraryComponents();
    const idx = all.findIndex(c => c.id === compId);
    if (idx < 0) return;
    if (newDealershipId) {
        all[idx] = { ...all[idx], dealershipId: newDealershipId };
    } else {
        const { dealershipId: _, ...rest } = all[idx];
        all[idx] = rest as SavedLibraryComponent;
    }
    localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(all));
    renderComponentLibrary();
    const dest = newDealershipId ? getDealershipGroups().find(g => g.id === newDealershipId)?.name : 'Global';
    showToast(`Moved to ${dest}`, 'success');
};

// Save template modal
const openSaveTemplateModal = () => {
    const overlay = document.getElementById('save-template-modal');
    if (!overlay) return;
    const nameInput = document.getElementById('save-template-name-input') as HTMLInputElement;
    if (nameInput) nameInput.value = `Template ${new Date().toLocaleDateString()}`;
    renderSaveAssignList('save-template-assign-list', activeDealershipId);
    overlay.classList.add('visible');

    const close = () => overlay.classList.remove('visible');

    document.getElementById('close-save-template-modal')?.replaceWith(
        (() => { const b = document.getElementById('close-save-template-modal')?.cloneNode(true) as HTMLElement; return b; })()
    );
    document.getElementById('cancel-save-template')?.replaceWith(
        (() => { const b = document.getElementById('cancel-save-template')?.cloneNode(true) as HTMLElement; return b; })()
    );
    document.getElementById('confirm-save-template')?.replaceWith(
        (() => { const b = document.getElementById('confirm-save-template')?.cloneNode(true) as HTMLElement; return b; })()
    );

    document.getElementById('close-save-template-modal')?.addEventListener('click', close);
    document.getElementById('cancel-save-template')?.addEventListener('click', close);
    document.getElementById('confirm-save-template')?.addEventListener('click', () => {
        const name = (document.getElementById('save-template-name-input') as HTMLInputElement)?.value.trim();
        if (!name) { showToast('Please enter a template name', 'error'); return; }
        const dealershipId = getAssignListSelection('save-template-assign-list');
        const newTemplate: SavedTemplate = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toISOString(),
            designSettings: { ...designSettings },
            components: [...activeComponents],
            ...(dealershipId ? { dealershipId } : {}),
        };
        const templates = getSavedTemplates();
        templates.unshift(newTemplate);
        localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
        renderSavedTemplates();
        close();
        const dest = dealershipId ? getDealershipGroups().find(g => g.id === dealershipId)?.name : 'Global';
        showToast(`Template saved to ${dest}`, 'success');
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
};

// Save component modal
let _pendingComponentId: string | null = null;

const updateLibraryComponent = (componentId: string) => {
    const comp = activeComponents.find(c => c.id === componentId);
    if (!comp || !comp.librarySourceId) return;
    const all = getSavedLibraryComponents();
    const idx = all.findIndex(item => item.id === comp.librarySourceId);
    if (idx < 0) {
        showToast('Original library component not found', 'error');
        return;
    }
    all[idx] = {
        ...all[idx],
        data: JSON.parse(JSON.stringify(comp.data)),
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(all));
    renderComponentLibrary();
    showToast(`Updated "${all[idx].name}" in library`, 'success');
};

const openSaveComponentModal = (componentId: string) => {
    const comp = activeComponents.find(c => c.id === componentId);
    if (!comp) return;

    // If this component originated from a library item, offer to update it directly
    if (comp.librarySourceId) {
        const all = getSavedLibraryComponents();
        const sourceItem = all.find(item => item.id === comp.librarySourceId);
        if (sourceItem) {
            // Show update-or-new choice modal inline
            const overlay = document.getElementById('save-component-modal');
            if (!overlay) return;
            _pendingComponentId = componentId;
            const modalContainer = overlay.querySelector('.quick-picker-modal.save-modal') as HTMLElement;
            if (!modalContainer) return;

            const originalBody = modalContainer.innerHTML;
            modalContainer.innerHTML = `
                <div class="quick-picker-header">
                    <h3 class="text-xl">Save to Library</h3>
                    <button type="button" id="close-save-component-modal" class="btn btn-secondary btn-sm" style="width:24px;height:24px;padding:0;border-radius:50%;">&times;</button>
                </div>
                <div class="save-modal-body">
                    <p class="text-sm" style="color:var(--label-secondary);margin-bottom:var(--spacing-md);">This component was loaded from <strong>${sourceItem.name}</strong>. What would you like to do?</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <button type="button" id="update-library-source-btn" class="btn btn-primary w-full">
                            Update "${sourceItem.name}"
                        </button>
                        <button type="button" id="save-as-new-library-btn" class="btn btn-secondary w-full">
                            Save as New Component
                        </button>
                    </div>
                </div>
            `;
            overlay.classList.add('visible');

            const close = () => {
                overlay.classList.remove('visible');
                modalContainer.innerHTML = originalBody;
                _pendingComponentId = null;
            };

            document.getElementById('close-save-component-modal')?.addEventListener('click', close);
            document.getElementById('update-library-source-btn')?.addEventListener('click', () => {
                updateLibraryComponent(componentId);
                close();
            });
            document.getElementById('save-as-new-library-btn')?.addEventListener('click', () => {
                close();
                // Clear librarySourceId so the new save flow treats it as a fresh item
                const cIdx = activeComponents.findIndex(c => c.id === componentId);
                if (cIdx >= 0) {
                    const { librarySourceId: _, ...rest } = activeComponents[cIdx];
                    activeComponents[cIdx] = rest;
                }
                openSaveComponentModal(componentId);
            });
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
            return;
        }
    }

    _pendingComponentId = componentId;

    const overlay = document.getElementById('save-component-modal');
    if (!overlay) return;
    const nameInput = document.getElementById('save-component-name-input') as HTMLInputElement;
    if (nameInput) nameInput.value = `${formatComponentTypeName(comp.type)} ${new Date().toLocaleDateString()}`;
    renderSaveAssignList('save-component-assign-list', activeDealershipId);
    overlay.classList.add('visible');

    const close = () => { overlay.classList.remove('visible'); _pendingComponentId = null; };

    document.getElementById('close-save-component-modal')?.replaceWith(
        (() => { const b = document.getElementById('close-save-component-modal')?.cloneNode(true) as HTMLElement; return b; })()
    );
    document.getElementById('cancel-save-component')?.replaceWith(
        (() => { const b = document.getElementById('cancel-save-component')?.cloneNode(true) as HTMLElement; return b; })()
    );
    document.getElementById('confirm-save-component')?.replaceWith(
        (() => { const b = document.getElementById('confirm-save-component')?.cloneNode(true) as HTMLElement; return b; })()
    );

    document.getElementById('close-save-component-modal')?.addEventListener('click', close);
    document.getElementById('cancel-save-component')?.addEventListener('click', close);
    document.getElementById('confirm-save-component')?.addEventListener('click', () => {
        const cId = _pendingComponentId;
        const c = cId ? activeComponents.find(x => x.id === cId) : null;
        if (!c) { close(); return; }
        const name = (document.getElementById('save-component-name-input') as HTMLInputElement)?.value.trim();
        if (!name) { showToast('Please enter a component name', 'error'); return; }
        const dealershipId = getAssignListSelection('save-component-assign-list');
        const libraryItem: SavedLibraryComponent = {
            id: Date.now().toString(),
            name,
            type: c.type,
            data: JSON.parse(JSON.stringify(c.data)),
            createdAt: new Date().toISOString(),
            ...(dealershipId ? { dealershipId } : {}),
        };
        const library = getSavedLibraryComponents();
        library.unshift(libraryItem);
        localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(library));
        renderComponentLibrary();
        close();
        const dest = dealershipId ? getDealershipGroups().find(g => g.id === dealershipId)?.name : 'Global';
        showToast(`Component saved to ${dest}`, 'success');
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
};

// --- End Dealership Assignment Helpers ---

const getSavedTemplates = (): SavedTemplate[] => {
    try {
        const data = localStorage.getItem(LS_TEMPLATES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load templates", e);
        return [];
    }
};

const saveTemplate = () => openSaveTemplateModal();

const startNewTemplate = () => {
    activeComponents = [];
    activeTemplateId = null;
    selectedComponentId = null;
    collapsedStates = {};
    designSettings = {
        fontFamily: "'Arial', sans-serif",
        buttonStyle: 'rounded',
        offersLayout: 'list',
        globalBodyColor: '#1d1d1f',
        globalLinkColor: '#007aff',
        globalFontSize: '14',
        colorScheme: 'classic',
        preheaderText: '',
    };
    if (fontSelect) fontSelect.value = designSettings.fontFamily;
    if (preheaderInput) { preheaderInput.value = ''; updatePreheaderCounter(); }
    syncGlobalTextStylesUI();
    saveCollapsedStates();
    saveToHistory();
    renderComponents();
    saveDraft();
    renderSaveTemplateBtnArea();
    renderSavedTemplates();
    showToast('Started new blank template', 'success');
};

const updateActiveTemplate = () => {
    if (!activeTemplateId) return;
    const all = getSavedTemplates();
    const idx = all.findIndex(t => t.id === activeTemplateId);
    if (idx < 0) return;
    all[idx] = {
        ...all[idx],
        designSettings: { ...designSettings },
        components: [...activeComponents],
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(all));
    renderSavedTemplates();
    showToast(`Updated: ${all[idx].name}`, 'success');
};

const renderSaveTemplateBtnArea = () => {
    // --- Right panel save/update buttons ---
    const container = document.getElementById('save-template-btn-area');
    if (container) {
        if (activeTemplateId) {
            const tpl = getSavedTemplates().find(t => t.id === activeTemplateId);
            const name = tpl ? tpl.name : 'Template';
            container.innerHTML = `
                <button type="button" id="update-template-btn" class="btn btn-primary w-full btn-sm">
                    Update "${name}"
                </button>
                <button type="button" id="save-template-btn" class="btn btn-secondary w-full btn-sm" style="margin-top:6px;">
                    Save as New Template
                </button>
            `;
        } else {
            container.innerHTML = `
                <button type="button" id="save-template-btn" class="btn btn-primary w-full btn-sm">
                    Save Current Template
                </button>
            `;
        }
        document.getElementById('update-template-btn')?.addEventListener('click', updateActiveTemplate);
        document.getElementById('save-template-btn')?.addEventListener('click', saveTemplate);
    }

    // --- Toolbar quick-update button ---
    const updateQuickBtn = document.getElementById('update-quick-btn') as HTMLButtonElement | null;
    if (updateQuickBtn) {
        if (activeTemplateId) {
            const tpl = getSavedTemplates().find(t => t.id === activeTemplateId);
            const name = tpl ? tpl.name : 'Template';
            updateQuickBtn.style.display = '';
            updateQuickBtn.dataset.tooltip = `Update "${name}"`;
            updateQuickBtn.onclick = updateActiveTemplate;
        } else {
            updateQuickBtn.style.display = 'none';
            updateQuickBtn.onclick = null;
        }
    }

    // --- Toolbar new-template button ---
    const newTemplateQuickBtn = document.getElementById('new-template-quick-btn') as HTMLButtonElement | null;
    if (newTemplateQuickBtn) {
        if (activeTemplateId) {
            newTemplateQuickBtn.style.display = '';
            newTemplateQuickBtn.onclick = startNewTemplate;
        } else {
            newTemplateQuickBtn.style.display = 'none';
            newTemplateQuickBtn.onclick = null;
        }
    }
};

const deleteTemplate = (id: string) => {
    const allTemplates = getSavedTemplates();
    const removedTemplate = allTemplates.find(t => t.id === id);
    const removedIndex = allTemplates.findIndex(t => t.id === id);
    const templates = allTemplates.filter(t => t.id !== id);
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
    if (activeTemplateId === id) {
        activeTemplateId = null;
        renderSaveTemplateBtnArea();
    }
    renderSavedTemplates();
    showToast('Template deleted', 'success', removedTemplate ? () => {
        const current = getSavedTemplates();
        current.splice(removedIndex, 0, removedTemplate);
        localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(current));
        renderSavedTemplates();
    } : undefined);
};

const loadTemplate = (id: string) => {
    const templates = getSavedTemplates();
    const template = templates.find(t => t.id === id);
    if (template) {
        designSettings = { ...designSettings, ...template.designSettings };
        activeComponents = [...template.components];
        activeTemplateId = id;
        // Collapse all sections by default when loading a template
        collapsedStates = {};
        activeComponents.forEach(c => { collapsedStates[c.id] = true; });
        saveCollapsedStates();
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        if (preheaderInput) { preheaderInput.value = designSettings.preheaderText || ''; updatePreheaderCounter(); }
        syncGlobalTextStylesUI();
        saveToHistory();
        renderComponents();
        saveDraft();
        renderSaveTemplateBtnArea();
        renderSavedTemplates();
        showToast(`Loaded: ${template.name}`, 'success');
    }
};

const updateTemplateStatus = (id: string, status: TemplateStatus) => {
    const all = getSavedTemplates();
    const idx = all.findIndex(t => t.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], status };
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(all));
    renderSavedTemplates();
};

const showStatusDropdown = (anchor: HTMLElement, current: TemplateStatus, onSelect: (s: TemplateStatus) => void) => {
    document.getElementById('status-dropdown')?.remove();
    const dropdown = document.createElement('div');
    dropdown.id = 'status-dropdown';
    dropdown.className = 'assignment-dropdown';

    dropdown.innerHTML = `
        <div class="assignment-dropdown-title">Set Status</div>
        ${TEMPLATE_STATUSES.map(s => `
            <button class="assignment-dropdown-item${s.value === current ? ' active' : ''}" data-status="${s.value}">
                <span class="status-dot status-dot--${s.value}"></span>
                <span>${s.label}</span>
                ${s.value === current ? '<span class="material-symbols-rounded" style="font-size:13px;margin-left:auto;">check</span>' : ''}
            </button>`).join('')}
    `;

    document.body.appendChild(dropdown);

    const rect = anchor.getBoundingClientRect();
    const dropW = 160;
    let left = rect.right - dropW;
    let top = rect.bottom + 4;
    if (left < 8) left = 8;
    if (top + 220 > window.innerHeight) top = rect.top - 224;
    dropdown.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${dropW}px;z-index:9999;`;

    dropdown.querySelectorAll('.assignment-dropdown-item').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            onSelect((btn as HTMLElement).dataset.status as TemplateStatus);
            dropdown.remove();
        });
    });
    const closeHandler = (e: Event) => {
        if (!dropdown.contains(e.target as Node)) {
            dropdown.remove();
            document.removeEventListener('click', closeHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
};

const renderSavedTemplates = () => {
    if (!savedTemplatesList) return;

    const allTemplates = getSavedTemplates();
    // 1. Dealership scope filter
    const scopedTemplates = allTemplates.filter(t =>
        !t.dealershipId || t.dealershipId === activeDealershipId
    );

    // 2. Render controls (search + status chips + sort) into #template-controls
    const controlsEl = document.getElementById('template-controls');
    if (controlsEl) {
        // Count per status for badge numbers
        const statusCounts: Record<string, number> = { all: scopedTemplates.length };
        TEMPLATE_STATUSES.forEach(s => {
            statusCounts[s.value] = scopedTemplates.filter(t => (t.status ?? 'open') === s.value).length;
        });

        controlsEl.innerHTML = `
            <div class="template-toolbar">
                <div class="template-search-wrap">
                    <span class="material-symbols-rounded template-search-icon">search</span>
                    <input type="text" id="template-search-input" class="template-search-input"
                        placeholder="Search templates…" value="${templateSearchQuery.replace(/"/g, '&quot;')}">
                    ${templateSearchQuery ? `<button class="template-search-clear" id="template-search-clear" title="Clear">
                        <span class="material-symbols-rounded" style="font-size:14px;">close</span>
                    </button>` : ''}
                </div>
                <div class="template-sort-wrap">
                    <select id="template-sort-select" class="template-sort-select">
                        <option value="date-desc" ${templateSortBy === 'date-desc' ? 'selected' : ''}>Newest</option>
                        <option value="date-asc"  ${templateSortBy === 'date-asc'  ? 'selected' : ''}>Oldest</option>
                        <option value="name-asc"  ${templateSortBy === 'name-asc'  ? 'selected' : ''}>Name A–Z</option>
                        <option value="name-desc" ${templateSortBy === 'name-desc' ? 'selected' : ''}>Name Z–A</option>
                        <option value="status"    ${templateSortBy === 'status'    ? 'selected' : ''}>By Status</option>
                    </select>
                </div>
            </div>
            <div class="template-status-filter-bar">
                <button class="tpl-status-chip ${templateStatusFilter === 'all' ? 'tpl-status-chip--active' : ''}" data-status="all">
                    All <span class="tpl-status-chip-count">${statusCounts.all}</span>
                </button>
                ${TEMPLATE_STATUSES.map(s => `
                <button class="tpl-status-chip tpl-status-chip--${s.value} ${templateStatusFilter === s.value ? 'tpl-status-chip--active' : ''}" data-status="${s.value}">
                    ${s.label} <span class="tpl-status-chip-count">${statusCounts[s.value]}</span>
                </button>`).join('')}
            </div>
        `;

        // Wire controls
        const searchInput = controlsEl.querySelector('#template-search-input') as HTMLInputElement;
        searchInput?.addEventListener('input', () => {
            templateSearchQuery = searchInput.value;
            renderSavedTemplates();
        });
        controlsEl.querySelector('#template-search-clear')?.addEventListener('click', () => {
            templateSearchQuery = '';
            renderSavedTemplates();
        });
        (controlsEl.querySelector('#template-sort-select') as HTMLSelectElement)?.addEventListener('change', e => {
            templateSortBy = (e.target as HTMLSelectElement).value as typeof templateSortBy;
            renderSavedTemplates();
        });
        controlsEl.querySelectorAll('.tpl-status-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                templateStatusFilter = (chip as HTMLElement).dataset.status as typeof templateStatusFilter;
                renderSavedTemplates();
            });
        });
    }

    // 3. Apply search
    const query = templateSearchQuery.trim().toLowerCase();
    let templates = query
        ? scopedTemplates.filter(t => t.name.toLowerCase().includes(query))
        : scopedTemplates;

    // 4. Apply status filter
    if (templateStatusFilter !== 'all') {
        templates = templates.filter(t => (t.status ?? 'open') === templateStatusFilter);
    }

    // 5. Sort
    const STATUS_ORDER: Record<TemplateStatus, number> = { open: 0, building: 1, review: 2, pending: 3, approved: 4 };
    templates = [...templates].sort((a, b) => {
        switch (templateSortBy) {
            case 'date-asc':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'name-asc':  return a.name.localeCompare(b.name);
            case 'name-desc': return b.name.localeCompare(a.name);
            case 'status':    return STATUS_ORDER[a.status ?? 'open'] - STATUS_ORDER[b.status ?? 'open'];
            default:          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });

    // 6. Render list
    const groups = getDealershipGroups();
    const activeName = activeDealershipId ? groups.find(g => g.id === activeDealershipId)?.name : null;
    const contextLabel = activeName
        ? `<p class="text-xs dealership-context-label"><span class="material-symbols-rounded" style="font-size:12px;vertical-align:middle;">store</span> ${activeName}</p>`
        : '';

    if (templates.length === 0) {
        const msg = query || templateStatusFilter !== 'all' ? 'No templates match your filters.' : 'No saved templates found.';
        savedTemplatesList.innerHTML = `${contextLabel}<p class="text-sm" style="color:var(--label-secondary);text-align:center;">${msg}</p>`;
        return;
    }

    savedTemplatesList.innerHTML = contextLabel + templates.map(t => {
        const status: TemplateStatus = t.status ?? 'open';
        const statusLabel = TEMPLATE_STATUSES.find(s => s.value === status)?.label ?? 'Open';
        const isTagged = !!t.dealershipId;
        const isActive = t.id === activeTemplateId;
        const dateLabel = t.updatedAt
            ? `Updated ${new Date(t.updatedAt).toLocaleString()}`
            : `Created ${new Date(t.createdAt).toLocaleString()}`;
        return `
        <div class="library-card tpl-card${isActive ? ' tpl-card--active' : ''}">
            <div class="tpl-card-top">
                <h4 class="library-card-name tpl-card-name">${t.name}${isActive ? ' <span class="tpl-active-badge">Loaded</span>' : ''}</h4>
                <div class="tpl-card-actions">
                    <button class="btn btn-ghost load-tpl-btn" data-id="${t.id}" data-tooltip="Load Template">
                        <span class="material-symbols-rounded" style="font-size:16px;">file_open</span>
                    </button>
                    <button class="btn btn-ghost move-tpl-btn" data-id="${t.id}" data-dealership="${t.dealershipId ?? ''}" data-tooltip="Move to…">
                        <span class="material-symbols-rounded" style="font-size:16px;">move_item</span>
                    </button>
                    <button class="btn btn-ghost tpl-del-btn del-tpl-btn" data-id="${t.id}" data-tooltip="Delete">
                        <span class="material-symbols-rounded" style="font-size:16px;">delete_forever</span>
                    </button>
                    <button class="status-badge status-badge--${status} tpl-status-btn" data-id="${t.id}" data-status="${status}" data-tooltip="Change status">
                        ${statusLabel}
                    </button>
                </div>
            </div>
            <p class="library-card-meta tpl-card-meta">
                ${!isTagged ? '<span class="global-badge">Global</span>' : ''}
                ${t.updatedAt ? '<span class="tpl-updated-badge">Updated</span>' : ''}
                <span>${dateLabel}</span>
            </p>
        </div>`;
    }).join('');

    // Wire card actions
    savedTemplatesList.querySelectorAll('.tpl-status-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            const cur = (btn as HTMLElement).dataset.status as TemplateStatus;
            showStatusDropdown(btn as HTMLElement, cur, s => updateTemplateStatus(id, s));
        });
    });
    savedTemplatesList.querySelectorAll('.load-tpl-btn').forEach(btn => {
        btn.addEventListener('click', () => loadTemplate(btn.getAttribute('data-id') || ''));
    });
    savedTemplatesList.querySelectorAll('.move-tpl-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id') || '';
            const curD = btn.getAttribute('data-dealership') || null;
            showAssignmentDropdown(btn as HTMLElement, curD || null, newId => reassignTemplate(id, newId));
        });
    });
    savedTemplatesList.querySelectorAll('.del-tpl-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTemplate(btn.getAttribute('data-id') || ''));
    });
};

// --- Component Library ---

const getSavedLibraryComponents = (): SavedLibraryComponent[] => {
    try {
        const data = localStorage.getItem(LS_LIBRARY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load component library", e);
        return [];
    }
};

const saveComponentToLibrary = (id: string) => openSaveComponentModal(id);

const addComponentFromLibrary = (libraryId: string) => {
    const library = getSavedLibraryComponents();
    const libraryItem = library.find(item => item.id === libraryId);
    if (!libraryItem) return;

    const newComponent: EmailComponent = {
        id: Date.now().toString(),
        type: libraryItem.type,
        data: JSON.parse(JSON.stringify(libraryItem.data)),
        librarySourceId: libraryId,
    };

    activeComponents.push(newComponent);
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`Added "${libraryItem.name}" from library`, 'success');

    setTimeout(() => {
        selectComponent(newComponent.id);
        const newElement = document.querySelector(`.component-item[data-id='${newComponent.id}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newElement.classList.add('highlight-pulse');
            setTimeout(() => newElement.classList.remove('highlight-pulse'), 1000);
        }
    }, 100);
};

const deleteLibraryComponent = (id: string) => {
    const allLibrary = getSavedLibraryComponents();
    const removedItem = allLibrary.find(item => item.id === id);
    const removedIndex = allLibrary.findIndex(item => item.id === id);
    const library = allLibrary.filter(item => item.id !== id);
    localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(library));
    renderComponentLibrary();
    showToast('Component removed from library', 'success', removedItem ? () => {
        const current = getSavedLibraryComponents();
        current.splice(removedIndex, 0, removedItem);
        localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(current));
        renderComponentLibrary();
    } : undefined);
};

const renderComponentLibrary = () => {
    const allLibrary = getSavedLibraryComponents();
    // Filter by active dealership: show global items + dealership-specific items
    const library = allLibrary.filter(item =>
        !item.dealershipId || item.dealershipId === activeDealershipId
    );
    if (!componentLibraryList) return;

    // Reset filter if its type no longer exists in visible library
    if (activeLibraryFilter !== 'all' && !library.some(item => item.type === activeLibraryFilter)) {
        activeLibraryFilter = 'all';
    }

    // Build filter bar
    if (libraryFilterBar) {
        if (library.length === 0) {
            libraryFilterBar.innerHTML = '';
        } else {
            const types = Array.from(new Set(library.map(item => item.type)));
            libraryFilterBar.innerHTML = `
                <div class="library-filter-bar">
                    <button class="library-filter-chip ${activeLibraryFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                    ${types.map(t => `<button class="library-filter-chip ${activeLibraryFilter === t ? 'active' : ''}" data-filter="${t}"><span class="material-symbols-rounded">${getComponentTypeIcon(t)}</span>${formatComponentTypeName(t)}</button>`).join('')}
                </div>
            `;
            libraryFilterBar.querySelectorAll('.library-filter-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    activeLibraryFilter = chip.getAttribute('data-filter') || 'all';
                    renderComponentLibrary();
                });
            });
        }
    }

    const filtered = activeLibraryFilter === 'all' ? library : library.filter(item => item.type === activeLibraryFilter);

    if (library.length === 0) {
        componentLibraryList.innerHTML = `<p class="text-sm" style="color: var(--label-secondary); text-align: center;">No saved components. Use the <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">bookmark</span> icon on any section to add it to your library.</p>`;
        return;
    }

    if (filtered.length === 0) {
        componentLibraryList.innerHTML = `<p class="text-sm" style="color: var(--label-secondary); text-align: center;">No saved ${formatComponentTypeName(activeLibraryFilter)} components.</p>`;
        return;
    }

    componentLibraryList.innerHTML = filtered.map(item => `
        <div class="library-card lib-card">
            <div class="lib-card-top">
                <div class="lib-card-title">
                    <span class="material-symbols-rounded" style="font-size:14px;color:var(--label-tertiary);flex-shrink:0;">${getComponentTypeIcon(item.type)}</span>
                    <span class="lib-card-title-text">${item.name}</span>
                </div>
                <div class="lib-card-actions">
                    <button class="btn btn-ghost add-from-library-btn" data-id="${item.id}" data-tooltip="Add Component">
                        <span class="material-symbols-rounded" style="font-size:15px;">library_add</span>
                    </button>
                    <button class="btn btn-ghost move-lib-btn" data-id="${item.id}" data-dealership="${item.dealershipId ?? ''}" data-tooltip="Move to…">
                        <span class="material-symbols-rounded" style="font-size:15px;">move_item</span>
                    </button>
                    <button class="btn btn-ghost lib-del-btn del-library-btn" data-id="${item.id}" data-tooltip="Delete">
                        <span class="material-symbols-rounded" style="font-size:15px;">delete_forever</span>
                    </button>
                </div>
            </div>
            <div class="library-card-meta lib-card-meta">
                <span class="library-type-badge">${formatComponentTypeName(item.type)}</span>
                ${!item.dealershipId ? '<span class="global-badge">Global</span>' : ''}
                ${item.updatedAt ? '<span class="tpl-updated-badge">Updated</span>' : ''}
                <span>${item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}` : new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');

    componentLibraryList.querySelectorAll('.add-from-library-btn').forEach(btn => {
        btn.addEventListener('click', () => addComponentFromLibrary(btn.getAttribute('data-id') || ''));
    });
    componentLibraryList.querySelectorAll('.move-lib-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id') || '';
            const currentDealership = btn.getAttribute('data-dealership') || null;
            showAssignmentDropdown(btn as HTMLElement, currentDealership || null, newId => reassignLibraryComponent(id, newId));
        });
    });
    componentLibraryList.querySelectorAll('.del-library-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteLibraryComponent(btn.getAttribute('data-id') || ''));
    });
};

// --- End Component Library ---

// --- Starter Templates ---

const STARTER_TEMPLATES: Record<string, { name: string; components: EmailComponent[] }> = {
    single_offer: {
        name: 'Single Offer',
        components: [
            { id: 's1', type: 'header', data: { text: 'Exclusive Offer Just for You', fontSize: '22', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'sales_offer', data: { ...getDefaultComponentData('sales_offer'), layout: 'center', vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}', mainOfferText: '$2,500 Trade-In Bonus', detailsText: 'Upgrade your current ride today with our exclusive seasonal offer.', disclaimerText: '*Terms and conditions apply. Offer valid through end of month.', btnText: 'View Details', btnLink: '{{dealership.tracked_website_homepage_url}}' } },
            { id: 's3', type: 'disclaimers', data: { text: '*Terms and conditions apply. See dealer for details. Cannot be combined with other offers.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
    two_column_offers: {
        name: '2-Column Offers',
        components: [
            { id: 's1', type: 'header', data: { text: 'This Month\'s Best Deals', fontSize: '22', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'service_offer', data: { ...getDefaultComponentData('service_offer'), layout: 'two_column', serviceTitle: 'Oil Change Special', couponCode: 'OILCHANGE50', serviceDetails: 'Get $50 off your next oil change. Includes synthetic blend oil and filter.', disclaimer: '*Valid at participating dealers only.', buttonText: 'Schedule Now', serviceTitle2: 'Tire Rotation Deal', couponCode2: 'TIRES25', serviceDetails2: 'Get $25 off your next tire rotation. Keep your tires wearing evenly.', disclaimer2: '*Cannot be combined with other offers.', buttonText2: 'Book Service' } },
            { id: 's3', type: 'disclaimers', data: { text: '*Offers valid at participating dealers. See dealer for complete details.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
    service_and_sales: {
        name: 'Service + Sales',
        components: [
            { id: 's1', type: 'header', data: { text: 'Your Monthly Update', fontSize: '22', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'service_offer', data: { ...getDefaultComponentData('service_offer'), layout: 'single', serviceTitle: 'Brake Inspection Special', couponCode: 'BRAKES30', serviceDetails: 'Complimentary multi-point brake inspection plus $30 off any brake service.', disclaimer: '*Valid at participating dealers only.', buttonText: 'Book Now' } },
            { id: 's3', type: 'divider', data: { width: '80', thickness: '1', lineColor: '#E5E5EA', alignment: 'center', paddingTop: '15', paddingBottom: '15', paddingLeftRight: '0' } },
            { id: 's4', type: 'sales_offer', data: { ...getDefaultComponentData('sales_offer'), layout: 'center', vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}', mainOfferText: '0% APR for 60 Months', detailsText: 'Drive home your dream vehicle with zero-interest financing.', disclaimerText: '*With approved credit. See dealer for details.', btnText: 'Shop Inventory', btnLink: '{{dealership.tracked_website_homepage_url}}' } },
            { id: 's5', type: 'disclaimers', data: { text: '*All offers subject to availability. See dealer for full terms and conditions.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
    recall_notice: {
        name: 'Recall Notice',
        components: [
            { id: 's1', type: 'header', data: { text: 'Important Safety Recall Notice', fontSize: '22', textColor: '#d00000', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'text_block', data: { text: 'Dear {{customer.first_name}},\n\nA safety recall has been issued for your {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}. This recall affects a critical component and we recommend scheduling your free recall service as soon as possible.\n\nYour safety is our top priority. This service is provided at no cost to you.', fontSize: '13', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', paddingTop: '10', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's3', type: 'button', data: { text: 'Schedule Recall Service', link: '{{dealership.tracked_website_homepage_url}}', fontSize: '13', textColor: '#ffffff', backgroundColor: '#d00000', align: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15', widthType: 'full' } },
            { id: 's4', type: 'disclaimers', data: { text: '*This is an important safety notice. Please contact us at {{dealership.phone}} if you have any questions. Recall service is always free of charge.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '15', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
};

const loadStarterTemplate = (templateKey: string) => {
    const starter = STARTER_TEMPLATES[templateKey];
    if (!starter) return;

    // Assign unique IDs to each component
    const components = starter.components.map(c => ({
        ...c,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        data: { ...c.data },
    }));

    activeComponents = components;
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`Loaded starter: ${starter.name}`, 'success');
};

// --- Starter Components ---

const STARTER_COMPONENTS: Record<string, { name: string; type: string; data: Record<string, string> }> = {
    hero_header: {
        name: 'Hero Header',
        type: 'header',
        data: { text: 'Your Headline Here', fontSize: '24', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '25', paddingBottom: '15', paddingLeftRight: '15' },
    },
    service_coupon: {
        name: 'Service Coupon',
        type: 'service_offer',
        data: { ...getDefaultComponentData('service_offer'), layout: 'single', serviceTitle: 'Oil Change Special', couponCode: 'SAVE50', serviceDetails: 'Get $50 off your next oil change service. Includes synthetic blend oil and filter replacement.', disclaimer: '*Valid at participating dealers only.', buttonText: 'Schedule Now' },
    },
    vehicle_offer: {
        name: 'Vehicle Offer',
        type: 'sales_offer',
        data: { ...getDefaultComponentData('sales_offer'), layout: 'center', vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}', mainOfferText: '$2,500 Trade-In Bonus', detailsText: 'Upgrade your vehicle today with our exclusive offer.', disclaimerText: '*Terms and conditions apply.', btnText: 'View Details', btnLink: '{{dealership.tracked_website_homepage_url}}' },
    },
    cta_button: {
        name: 'CTA Button',
        type: 'button',
        data: { text: 'Shop Now', link: '{{dealership.tracked_website_homepage_url}}', fontSize: '13', textColor: '#ffffff', backgroundColor: '#007aff', align: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15', widthType: 'full' },
    },
};

const addStarterComponent = (componentKey: string) => {
    const starter = STARTER_COMPONENTS[componentKey];
    if (!starter) return;

    const newComponent: EmailComponent = {
        id: Date.now().toString(),
        type: starter.type,
        data: { ...starter.data },
    };

    activeComponents.push(newComponent);
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`Added: ${starter.name}`, 'success');

    setTimeout(() => {
        selectComponent(newComponent.id);
        const newElement = document.querySelector(`.component-item[data-id='${newComponent.id}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

// --- End Starter Templates & Components ---

const loadDraft = (dealershipId?: string | null) => {
    try {
        const data = localStorage.getItem(getDraftKey(dealershipId));
        if (data) {
            const draft = JSON.parse(data);
            if (draft && draft.designSettings && Array.isArray(draft.activeComponents)) {
                designSettings = { ...designSettings, ...draft.designSettings };
                activeComponents = draft.activeComponents;
                if (fontSelect) fontSelect.value = designSettings.fontFamily;
                if (preheaderInput) { preheaderInput.value = designSettings.preheaderText || ''; updatePreheaderCounter(); }
                renderComponents();
            }
        }
    } catch (e) {
        console.error("Failed to load draft", e);
    }
    saveToHistory(); // Save initial state
};

const getButtonStyleSectionHtml = (): string => {
    return `
        <div class="design-option-group" id="button-style-section" style="border-top: 1px solid var(--separator-secondary); margin-top: var(--spacing-lg); padding-top: var(--spacing-lg);">
          <h4>Button Styles</h4>
          <div class="button-style-stack">
            <div class="button-style-option ${designSettings.buttonStyle === 'rounded' ? 'selected' : ''}" data-button="rounded">
              <div class="button-preview" style="background: #007aff; border-radius: 8px;">Rounded</div>
            </div>
            <div class="button-style-option ${designSettings.buttonStyle === 'pill' ? 'selected' : ''}" data-button="pill">
              <div class="button-preview" style="background: #007aff; border-radius: 20px;">Pill</div>
            </div>
            <div class="button-style-option ${designSettings.buttonStyle === 'square' ? 'selected' : ''}" data-button="square">
              <div class="button-preview" style="background: #007aff; border-radius: 0px;">Square</div>
            </div>
            <div class="button-style-option ${designSettings.buttonStyle === 'outlined' ? 'selected' : ''}" data-button="outlined">
              <div class="button-preview" style="background: transparent; border: 2px solid #007aff; color: #007aff; border-radius: 8px;">Outlined</div>
            </div>
          </div>
        </div>
    `;
};

const attachButtonStyleListeners = () => {
    const options = dynamicStylingContainer?.querySelectorAll('.button-style-option');
    if (!options) return;
    
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            designSettings.buttonStyle = opt.getAttribute('data-button') || 'rounded';
            saveDraft();
            saveToHistory();
            showToast('Button style updated', 'success');
        });
    });
};

const alignmentControlHtml = (dataStyleKey: string, currentValue: string, disabled: boolean = false) => {
    const options = ['left', 'center', 'right'];
    const buttonsHtml = options.map(opt => `
        <button 
            type="button" 
            class="toggle-btn alignment-toggle style-control ${currentValue === opt ? 'active' : ''}" 
            data-style-key="${dataStyleKey}" 
            data-value="${opt}"
            ${disabled ? 'disabled' : ''}
            data-tooltip="Align ${opt}"
        >
            ${ALIGNMENT_ICONS[opt as keyof typeof ALIGNMENT_ICONS]}
        </button>
    `).join('');

    return `<div class="toggle-group">${buttonsHtml}</div>`;
};

const buttonWidthControlHtml = (currentValue: string, dataStyleKey: string): string => {
    const options = [
        { label: 'Auto', value: 'auto', indicatorWidth: '30%' },
        { label: 'Full', value: 'full', indicatorWidth: '100%' },
        { label: 'S', value: 'small', indicatorWidth: '25%' },
        { label: 'M', value: 'medium', indicatorWidth: '50%' },
        { label: 'L', value: 'large', indicatorWidth: '75%' }
    ];

    // Map old pixel/percentage values for service_offer to new keywords for UI state
    const mapOldValues = (val: string) => {
        if (!val) return 'auto';
        switch(val) {
            case '100%': return 'full';
            case '160px': return 'small';
            case '280px': return 'medium';
            case '400px': return 'large';
            default: return val; // covers auto, full, small, medium, large
        }
    };
    const mappedValue = mapOldValues(currentValue);

    const buttonsHtml = options.map(opt => `
        <button type="button" 
            class="btn-width-option style-control ${mappedValue === opt.value ? 'active' : ''}" 
            data-style-key="${dataStyleKey}" 
            data-value="${opt.value}"
            data-tooltip="${opt.label}"
        >
            <span>${opt.label}</span>
            <div class="width-indicator-wrapper">
                <div class="width-indicator" style="width: ${opt.indicatorWidth};"></div>
            </div>
        </button>
    `).join('');

    return `<div class="btn-width-group">${buttonsHtml}</div>`;
};

// Moved colorPickerHtml to a higher scope to be accessible by colorControlsHtml.
const colorPickerHtml = (dataStyleKey: string, value: string, disabled: boolean = false) => {
    const disabledAttr = disabled ? 'disabled' : '';
    const onclickAttr = disabled ? '' : `onclick="this.querySelector('input[type=color]').click()"`;
    return `
        <div class="color-picker-wrapper">
            <div class="color-input-container mini" ${onclickAttr}>
                <div class="color-swatch-display" style="background-color: ${value};"></div>
                <input type="color" class="color-input-hidden style-control" data-style-key="${dataStyleKey}" value="${value}" ${disabledAttr}>
            </div>
            <input type="text" class="form-control compact color-hex-input" value="${value.toUpperCase()}" maxlength="7" ${disabledAttr}>
        </div>
    `;
};

const typographyControlsHtml = (data: Record<string, string>, keys: Record<string, string>) => {
    let html = '';
    const hasFontSize = keys.fontSize && data[keys.fontSize];
    const hasFormatting = (keys.fontWeight && data[keys.fontWeight]) || (keys.fontStyle && data[keys.fontStyle]);

    if(hasFontSize || hasFormatting) {
        html += `<div class="grid grid-cols-2">`;
        if (hasFontSize) {
            html += `
                <div class="form-group">
                    <label class="form-label">Font Size (px)</label>
                    <input type="number" class="form-control style-control" data-style-key="${keys.fontSize}" value="${data[keys.fontSize] || ''}">
                </div>
            `;
        }
        if (hasFormatting) {
             html += `
                <div class="form-group">
                    <label class="form-label">Formatting</label>
                    <div style="display: flex; gap: 4px;">
                        ${keys.fontWeight ? `<button type="button" class="btn btn-secondary format-toggle style-control ${data[keys.fontWeight] === 'bold' ? 'active' : ''}" data-style-key="${keys.fontWeight}" data-val-on="bold" data-val-off="normal" style="font-weight: 800; font-size: 11px; width: 27px; height: 27px; padding: 0; border-radius: var(--radius-md);">B</button>` : ''}
                        ${keys.fontStyle ? `<button type="button" class="btn btn-secondary format-toggle style-control ${data[keys.fontStyle] === 'italic' ? 'active' : ''}" data-style-key="${keys.fontStyle}" data-val-on="italic" data-val-off="normal" style="font-style: italic; font-size: 11px; width: 27px; height: 27px; padding: 0; border-radius: var(--radius-md);">I</button>`: ''}
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    return html;
};

const colorControlsHtml = (data: Record<string, string>, colorConfigs: { key: string, label: string }[], disabledFields: Record<string, boolean> = {}) => {
    if (!colorConfigs || colorConfigs.length === 0) return '';
    
    const colorsHtml = colorConfigs.map(config => {
        const isDisabled = disabledFields[config.key] || false;
        const value = data[config.key] === 'transparent' ? '#ffffff' : data[config.key] || '#000000';
        return `
            <div class="form-group">
                <label class="form-label">${config.label}</label>
                ${colorPickerHtml(config.key, value, isDisabled)}
            </div>
        `;
    }).join('');

    return `<div class="grid grid-cols-2">${colorsHtml}</div>`;
}

const paddingControlsHtml = (data: Record<string, string>, paddingConfigs: { key: string, label: string }[]) => {
    if (!paddingConfigs || paddingConfigs.length === 0) return '';
    const controls = paddingConfigs.map(c => `
        <div class="form-group">
            <label class="form-label">${c.label}</label>
            <input type="number" class="form-control style-control" data-style-key="${c.key}" value="${data[c.key] || 0}">
        </div>
    `).join('');
    return `<div class="grid grid-cols-3">${controls}</div>`;
};

const getDefaultFieldStyles = (compType: string, fieldKey: string, subOfferIndex?: number): Record<string, string> => {
    switch (compType) {
        case 'header':
            return {
                fontSize: designSettings.globalFontSize || '18',
                textColor: designSettings.globalBodyColor || '#1d1d1f',
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textAlign: 'center',
                paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15'
            };
        case 'text_block':
            return {
                fontSize: designSettings.globalFontSize || '12',
                textColor: designSettings.globalBodyColor || '#3c3c43',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
                paddingTop: '8', paddingBottom: '8', paddingLeftRight: '15'
            };
        case 'disclaimers':
            return {
                fontSize: '9',
                textColor: '#86868b',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'center',
                paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15'
            };
        case 'button':
            return {
                fontSize: '12',
                textColor: '#ffffff',
                backgroundColor: designSettings.globalLinkColor || '#007aff',
                align: 'center',
                paddingTop: '9', paddingBottom: '9', paddingLeftRight: '15',
                widthType: 'auto'
            };
        case 'footer': {
            if (fieldKey === 'footerLinks') {
                return {
                    fontSize: '12', fontWeight: 'normal', fontStyle: 'normal',
                    textDecoration: 'none', textColor: designSettings.globalLinkColor || '#007aff',
                };
            }
            if (fieldKey === 'footerSeparator') {
                return { separatorColor: '#c7c7cc', separatorStyle: 'dot', linkSpacing: '12' };
            }
            if (fieldKey === 'footerContainer') {
                return {
                    textAlign: 'center', backgroundColor: 'transparent',
                    paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15',
                };
            }
            return {
                fontSize: '12', fontWeight: 'normal', fontStyle: 'normal',
                textDecoration: 'none', textAlign: 'center',
                textColor: designSettings.globalLinkColor || '#007aff',
                backgroundColor: 'transparent', separatorColor: '#c7c7cc', separatorStyle: 'dot',
                paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15', linkSpacing: '12',
            };
        }
        case 'divider':
            return {
                width: '100', thickness: '1', lineColor: '#CCCCCC',
                alignment: 'center',
                paddingTop: '12', paddingBottom: '12', paddingLeftRight: '0'
            };
        case 'spacer':
            return {
                height: '30', backgroundColor: 'transparent', matchEmailBackground: 'true'
            };
        case 'image':
            return {
                width: '100%', align: 'center',
                paddingTop: '0', paddingBottom: '0', paddingLeftRight: '0'
            };
        case 'service_offer': {
            const suffix = fieldKey.endsWith('2') ? '2' : '';
            const baseKey = fieldKey.replace(/2$/, '');
            switch (baseKey) {
                case 'serviceOfferTitle': {
                    const p = 'title';
                    return {
                        [`${p}FontSize${suffix}`]: '18', [`${p}FontWeight${suffix}`]: 'bold', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#000000', [`${p}BgColor${suffix}`]: 'transparent', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '8', [`${p}PaddingBottom${suffix}`]: '8', [`${p}PaddingLeftRight${suffix}`]: '0'
                    };
                }
                case 'serviceOfferCoupon': {
                    const p = 'coupon';
                    return {
                        [`${p}FontSize${suffix}`]: '15', [`${p}FontWeight${suffix}`]: 'bold', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#0066FF', [`${p}BgColor${suffix}`]: '#F0F7FF', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '6', [`${p}PaddingBottom${suffix}`]: '6', [`${p}PaddingLeftRight${suffix}`]: '12'
                    };
                }
                case 'serviceOfferDetails': {
                    const p = 'details';
                    return {
                        [`${p}FontSize${suffix}`]: '12', [`${p}FontWeight${suffix}`]: 'normal', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#333333', [`${p}BgColor${suffix}`]: 'transparent', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '9', [`${p}PaddingBottom${suffix}`]: '9', [`${p}PaddingLeftRight${suffix}`]: '0'
                    };
                }
                case 'serviceOfferDisclaimer': {
                    const p = 'disclaimer';
                    return {
                        [`${p}FontSize${suffix}`]: '9', [`${p}FontWeight${suffix}`]: 'normal', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#666666', [`${p}BgColor${suffix}`]: 'transparent', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '6', [`${p}PaddingBottom${suffix}`]: '6', [`${p}PaddingLeftRight${suffix}`]: '0'
                    };
                }
                case 'serviceOfferButton':
                    return {
                        [`buttonFontSize${suffix}`]: '12', [`buttonFontWeight${suffix}`]: 'bold', [`buttonAlignment${suffix}`]: 'center',
                        [`buttonBgColor${suffix}`]: '#0066FF', [`buttonTextColor${suffix}`]: '#FFFFFF',
                        [`buttonPaddingTop${suffix}`]: '9', [`buttonPaddingBottom${suffix}`]: '9', [`buttonPaddingLeftRight${suffix}`]: '15',
                        [`buttonWidth${suffix}`]: 'auto', [`buttonBorderRadius${suffix}`]: '8', [`buttonBorderColor${suffix}`]: '', [`buttonBorderWidth${suffix}`]: '0'
                    };
                case 'serviceOfferImage':
                    return {
                        [`imageWidth${suffix}`]: '100', [`imageAlignment${suffix}`]: 'center',
                        [`imagePaddingTop${suffix}`]: '8', [`imagePaddingBottom${suffix}`]: '8'
                    };
                default: return {};
            }
        }
        case 'sales_offer': {
            const suffix = fieldKey.endsWith('2') ? '2' : '';
            const prefix = fieldKey.replace(/2$/, '');

            if (fieldKey.startsWith('salesOfferButton')) {
                return {
                    [`btnFontSize${suffix}`]: '12', [`btnFontWeight${suffix}`]: 'bold', [`btnPaddingTop${suffix}`]: '9', [`btnPaddingBottom${suffix}`]: '9', [`btnPaddingLeftRight${suffix}`]: '15',
                    [`btnColor${suffix}`]: '#007aff', [`btnTextColor${suffix}`]: '#ffffff', [`btnAlign${suffix}`]: 'center', [`btnWidthType${suffix}`]: 'full',
                    [`btnBorderRadius${suffix}`]: '8', [`btnBorderColor${suffix}`]: '', [`btnBorderWidth${suffix}`]: '0'
                };
            }

            const finalPrefix = prefix.replace(/2$/, '');
            const keySuffix = subOfferIndex !== undefined ? '' : suffix;

            const defaultsByPrefix: Record<string, Record<string, string>> = {
                vehicle: { FontSize: '18', FontWeight: 'normal', FontStyle: 'normal', Color: '#1d1d1f', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '0', PaddingBottom: '6', PaddingLeftRight: '0' },
                mainOffer: { FontSize: '21', FontWeight: 'normal', FontStyle: 'normal', Color: '#007aff', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '0', PaddingBottom: '6', PaddingLeftRight: '0' },
                details: { FontSize: '12', FontWeight: 'normal', FontStyle: 'normal', Color: '#6e6e73', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '0', PaddingBottom: '9', PaddingLeftRight: '0' },
                stockVin: { FontSize: '12', FontWeight: 'normal', FontStyle: 'normal', Color: '#86868b', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '8', PaddingBottom: '0', PaddingLeftRight: '0' },
                mileage: { FontSize: '12', FontWeight: 'normal', FontStyle: 'normal', Color: '#86868b', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '3', PaddingBottom: '0', PaddingLeftRight: '0' },
                disclaimer: { FontSize: '9', FontWeight: 'normal', FontStyle: 'normal', Color: '#86868b', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '12', PaddingBottom: '0', PaddingLeftRight: '0' }
            };

            const prefixDefaults = defaultsByPrefix[finalPrefix];
            if (!prefixDefaults) return {};

            const result: Record<string, string> = {};
            for (const [prop, val] of Object.entries(prefixDefaults)) {
                result[`${finalPrefix}${prop}${keySuffix}`] = val;
            }
            return result;
        }
        default: return {};
    }
};

const renderStandardStylingPanel = (
    data: Record<string, string>,
    config: Record<string, any>,
    updateFn: (key: string, value: string) => void,
    disabledFields: Record<string, boolean> = {}
) => {
    if (!dynamicStylingContainer || !activeField) return;

    const comp = activeComponents.find(c => c.id === activeField.componentId);
    if (!comp) return;

    const formattedCompType = comp.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
            <div style="display: flex; align-items: center; gap: 3px;">
                <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--label-tertiary);">${formattedCompType}</span>
                <span style="color: var(--label-tertiary); font-size: 9px; padding-bottom: 2px;">›</span>
                <span style="font-size: 11px; font-weight: 600; color: var(--label-primary);">${activeField.fieldLabel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
                <button type="button" id="reset-field-styles-btn" class="btn btn-ghost" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; color: var(--label-secondary); line-height: 1;">Reset</button>
                <button type="button" id="close-styling-panel-btn" class="btn btn-ghost" style="width: 18px; height: 18px; padding: 0; border-radius: 50%; line-height: 1;">&times;</button>
            </div>
        </div>
        <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-md);">
    `;

    // Typography
    if (config.typography) {
        html += typographyControlsHtml(data, config.typography);
    }

    // Colors
    if (config.colors) {
        html += colorControlsHtml(data, config.colors, disabledFields);
    }
    
    // Alignment
    if (config.alignment) {
        const configKey = Object.keys(config.alignment)[0];
        const dataKey = config.alignment[configKey];
        html += `
            <div class="form-group">
                <label class="form-label">Alignment</label>
                ${alignmentControlHtml(dataKey, data[dataKey] || 'center')}
            </div>
        `;
    }

    // Sizing (Width, Button Width, etc.)
    if(config.sizing) {
        let sizingGridHtml = '';
        if(config.sizing.width) {
             sizingGridHtml += `<div class="form-group"><label class="form-label">Width (%)</label><input type="number" class="form-control style-control" data-style-key="${config.sizing.width}" value="${parseInt(data[config.sizing.width] || '100', 10)}"></div>`;
        }
        if(config.sizing.thickness) {
            sizingGridHtml += `<div class="form-group"><label class="form-label">Thickness (px)</label><input type="number" class="form-control style-control" data-style-key="${config.sizing.thickness}" value="${data[config.sizing.thickness] || '2'}"></div>`;
        }
        if(config.sizing.height) {
            sizingGridHtml += `<div class="form-group"><label class="form-label">Height (px)</label><input type="number" class="form-control style-control" data-style-key="${config.sizing.height}" value="${data[config.sizing.height] || '40'}"></div>`;
        }
        if (sizingGridHtml) {
            html += `<div class="grid grid-cols-2">${sizingGridHtml}</div>`;
        }
        
        if(config.sizing.buttonWidth) {
             html += `<div class="form-group"><label class="form-label">Button Width</label>${buttonWidthControlHtml(data[config.sizing.buttonWidth], config.sizing.buttonWidth)}</div>`;
        }
    }
    
    // Padding
    if (config.padding) {
        html += paddingControlsHtml(data, config.padding);
    }

    if (config.customHtml) {
        html += config.customHtml(data);
    }

    html += `</div>`;

    if (config.showButtonStyle) {
        html += getButtonStyleSectionHtml();
    }

    if (config.showGridReverse) {
        const isReversed = data.mobileReverse === 'true';
        html += `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); margin-top: var(--spacing-lg); padding-top: var(--spacing-lg);">
                <h4 style="margin: 0 0 4px; font-size: 12px; font-weight: 600;">Mobile Column Order</h4>
                <div class="form-group" style="display: flex; align-items: center; gap: 6px; margin-top: var(--spacing-sm);">
                    <input type="checkbox" class="style-control" data-style-key="mobileReverse" ${isReversed ? 'checked' : ''} style="width: auto; height: auto; cursor: pointer;">
                    <label class="form-label" style="margin-bottom: 0; cursor: pointer;">Reverse column order on mobile</label>
                </div>
                <p style="font-size: 11px; color: var(--label-tertiary); margin: 4px 0 0;">Right column will stack above left on screens &le;600px</p>
            </div>
        `;
    }

    if (config.showMobileOverrides) {
        html += `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); margin-top: var(--spacing-lg); padding-top: var(--spacing-lg);">
                <h4 style="margin: 0 0 4px; font-size: 12px; font-weight: 600;">Mobile Overrides</h4>
                <p style="font-size: 11px; color: var(--label-tertiary); margin: 0 0 var(--spacing-sm);">Override styles at &le;600px screen width</p>
                <div class="form-group" style="display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" class="style-control" data-style-key="mobileHide" ${data.mobileHide === 'true' ? 'checked' : ''} style="width: auto; height: auto; cursor: pointer;">
                    <label class="form-label" style="margin-bottom: 0; cursor: pointer;">Hide component on mobile</label>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size (px)</label>
                        <input type="number" class="form-control style-control" data-style-key="mobileFontSize" value="${data.mobileFontSize || ''}" placeholder="inherit" min="8" max="72">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Side Padding (px)</label>
                        <input type="number" class="form-control style-control" data-style-key="mobilePadding" value="${data.mobilePadding || ''}" placeholder="inherit" min="0" max="60">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Alignment</label>
                    ${alignmentControlHtml('mobileAlignment', data.mobileAlignment || '')}
                </div>
            </div>
        `;
    }

    dynamicStylingContainer.innerHTML = html;

    dynamicStylingContainer.querySelector('#close-styling-panel-btn')?.addEventListener('click', () => {
        if (activeField?.element) {
            activeField.element.classList.remove('field-active');
        }
        activeField = null;
        renderStylingPanel();
    });

    dynamicStylingContainer.querySelector('#reset-field-styles-btn')?.addEventListener('click', () => {
        if (!activeField) return;
        const comp = activeComponents.find(c => c.id === activeField!.componentId);
        if (!comp) return;
        const defaults = getDefaultFieldStyles(comp.type, activeField.fieldKey, activeField.subOfferIndex);
        for (const [key, value] of Object.entries(defaults)) {
            updateFn(key, value);
        }
        renderStylingPanel();
    });

    // Attach Listeners
    dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
        const inputEl = el as HTMLInputElement | HTMLButtonElement;
        const key = inputEl.dataset.styleKey;
        if (!key) return;

        if (inputEl.classList.contains('format-toggle')) {
            inputEl.addEventListener('click', () => {
                const onVal = inputEl.dataset.valOn as string;
                const offVal = inputEl.dataset.valOff as string;
                const newVal = data[key] === onVal ? offVal : onVal;
                updateFn(key, newVal);
                renderStylingPanel();
            });
        } else if (inputEl.classList.contains('alignment-toggle') || inputEl.classList.contains('btn-width-option')) {
            inputEl.addEventListener('click', () => {
                const value = inputEl.dataset.value;
                if(value) updateFn(key, value);
                renderStylingPanel();
            });
        } else {
             const eventType = (inputEl as HTMLInputElement).type === 'checkbox' ? 'change' : 'input';
             inputEl.addEventListener(eventType, () => {
                let value = (inputEl as HTMLInputElement).type === 'checkbox' ? (inputEl as HTMLInputElement).checked.toString() : inputEl.value;
                if (key.toLowerCase().includes('width') && !key.toLowerCase().includes('widthtype')) {
                    value = `${value}%`;
                }
                updateFn(key, value);
             });
        }
    });

    if (config.showButtonStyle) {
        attachButtonStyleListeners();
    }
}


const renderStylingPanel = () => {
    if (!dynamicStylingContainer || !activeField) {
        if(dynamicStylingContainer) dynamicStylingContainer.innerHTML = '';
        return;
    }

    const comp = activeComponents.find(c => c.id === activeField.componentId);
    if (!comp) {
        dynamicStylingContainer.innerHTML = '';
        return;
    }
    
    const attachColorPickerListeners = () => {
        dynamicStylingContainer.querySelectorAll('.color-picker-wrapper').forEach(wrapper => {
            const colorInput = wrapper.querySelector('.color-input-hidden') as HTMLInputElement;
            const textInput = wrapper.querySelector('.color-hex-input') as HTMLInputElement;
            const swatch = wrapper.querySelector('.color-swatch-display') as HTMLDivElement;

            if (!colorInput || !textInput || !swatch) return;

            colorInput.addEventListener('input', () => {
                const newColor = colorInput.value.toUpperCase();
                if (textInput.value.toUpperCase() !== newColor) {
                    textInput.value = newColor;
                }
                swatch.style.backgroundColor = colorInput.value;
                colorInput.dispatchEvent(new Event('input', { bubbles: true }));
            });

            textInput.addEventListener('input', () => {
                const value = textInput.value;
                if (/^#([0-9a-f]{3}){1,2}$/i.test(value)) {
                    if (colorInput.value.toUpperCase() !== value.toUpperCase()) {
                        colorInput.value = value;
                        swatch.style.backgroundColor = value;
                        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            textInput.addEventListener('blur', () => {
                if (!/^#([0-9a-f]{3}){1,2}$/i.test(textInput.value)) {
                    textInput.value = colorInput.value.toUpperCase();
                } else {
                    textInput.value = textInput.value.toUpperCase();
                }
            });
        });
    };

    const baseUpdateFn = (key: string, value: string) => updateComponentData(comp.id, key, value);

    switch (comp.type) {
        case 'header':
        case 'text_block':
        case 'disclaimers':
            renderStandardStylingPanel(comp.data, {
                typography: { fontSize: 'fontSize', fontWeight: 'fontWeight', fontStyle: 'fontStyle'},
                colors: [
                    { key: 'textColor', label: 'Text Color' },
                    { key: 'backgroundColor', label: 'Background' }
                ],
                alignment: { textAlign: 'textAlign'},
                padding: [
                    {key: 'paddingTop', label: 'Padding T'},
                    {key: 'paddingBottom', label: 'Padding B'},
                    {key: 'paddingLeftRight', label: 'Padding L/R'}
                ],
                showMobileOverrides: true
            }, baseUpdateFn);
            break;

        case 'button':
             renderStandardStylingPanel(comp.data, {
                typography: { fontSize: 'fontSize' },
                colors: [
                    { key: 'backgroundColor', label: 'Button Color' },
                    { key: 'textColor', label: 'Text Color' }
                ],
                alignment: { align: 'align'},
                sizing: { buttonWidth: 'widthType' },
                padding: [
                    { key: 'paddingTop', label: 'Padding T' },
                    { key: 'paddingBottom', label: 'Padding B' },
                    { key: 'paddingLeftRight', label: 'Padding L/R' }
                ],
                showButtonStyle: true,
                showMobileOverrides: true
            }, baseUpdateFn);
            break;

        case 'footer': {
            const footerFieldKey = activeField.fieldKey;
            if (footerFieldKey === 'footerLinks') {
                renderStandardStylingPanel(comp.data, {
                    typography: { fontSize: 'fontSize', fontWeight: 'fontWeight', fontStyle: 'fontStyle' },
                    colors: [
                        { key: 'textColor', label: 'Link Color' },
                    ],
                    customHtml: () => {
                        const currentDecor = comp.data.textDecoration || 'none';
                        return `
                            <div class="styling-section">
                                <h4 class="styling-section-title">Text Decoration</h4>
                                <div style="display: flex; gap: 4px;">
                                    <button type="button" class="btn btn-secondary format-toggle style-control ${currentDecor === 'underline' ? 'active' : ''}" data-style-key="textDecoration" data-val-on="underline" data-val-off="none" style="font-size: 11px; width: 27px; height: 27px; padding: 0; border-radius: var(--radius-md); text-decoration: underline;">U</button>
                                </div>
                            </div>
                        `;
                    },
                    showMobileOverrides: true
                }, baseUpdateFn);
            } else if (footerFieldKey === 'footerSeparator') {
                renderStandardStylingPanel(comp.data, {
                    colors: [
                        { key: 'separatorColor', label: 'Separator Color' },
                    ],
                    customHtml: () => {
                        const currentStyle = comp.data.separatorStyle || 'dot';
                        return `
                            <div class="styling-section">
                                <h4 class="styling-section-title">Separator Style</h4>
                                <div class="footer-separator-style-picker">
                                    <button type="button" class="btn btn-secondary style-control format-toggle ${currentStyle === 'dot' ? 'active' : ''}" data-style-key="separatorStyle" data-val-on="dot" data-val-off="dot" style="font-size: 13px; min-width: 36px; height: 27px; padding: 0 6px; border-radius: var(--radius-md);">·</button>
                                    <button type="button" class="btn btn-secondary style-control format-toggle ${currentStyle === 'pipe' ? 'active' : ''}" data-style-key="separatorStyle" data-val-on="pipe" data-val-off="pipe" style="font-size: 13px; min-width: 36px; height: 27px; padding: 0 6px; border-radius: var(--radius-md);">|</button>
                                    <button type="button" class="btn btn-secondary style-control format-toggle ${currentStyle === 'dash' ? 'active' : ''}" data-style-key="separatorStyle" data-val-on="dash" data-val-off="dash" style="font-size: 13px; min-width: 36px; height: 27px; padding: 0 6px; border-radius: var(--radius-md);">—</button>
                                </div>
                            </div>
                            <div class="styling-section">
                                <h4 class="styling-section-title">Spacing</h4>
                                <div class="grid grid-cols-2">
                                    <div class="form-group">
                                        <label class="form-label">Link Spacing (px)</label>
                                        <input type="number" class="form-control style-control" data-style-key="linkSpacing" value="${comp.data.linkSpacing || '12'}" min="0" max="60">
                                    </div>
                                </div>
                            </div>
                        `;
                    },
                }, baseUpdateFn);
            } else if (footerFieldKey === 'footerContainer') {
                renderStandardStylingPanel(comp.data, {
                    colors: [
                        { key: 'backgroundColor', label: 'Background' },
                    ],
                    alignment: { textAlign: 'textAlign' },
                    padding: [
                        { key: 'paddingTop', label: 'Padding T' },
                        { key: 'paddingBottom', label: 'Padding B' },
                        { key: 'paddingLeftRight', label: 'Padding L/R' },
                    ],
                }, baseUpdateFn);
            } else {
                // Fallback: show all footer controls
                renderStandardStylingPanel(comp.data, {
                    typography: { fontSize: 'fontSize', fontWeight: 'fontWeight', fontStyle: 'fontStyle' },
                    colors: [
                        { key: 'textColor', label: 'Link Color' },
                        { key: 'separatorColor', label: 'Separator Color' },
                        { key: 'backgroundColor', label: 'Background' }
                    ],
                    alignment: { textAlign: 'textAlign' },
                    padding: [
                        { key: 'paddingTop', label: 'Padding T' },
                        { key: 'paddingBottom', label: 'Padding B' },
                        { key: 'paddingLeftRight', label: 'Padding L/R' },
                        { key: 'linkSpacing', label: 'Link Spacing' }
                    ],
                }, baseUpdateFn);
            }
            break;
        }

        case 'sales_offer':
            {
                let dataObject = comp.data;
                let updateFn = baseUpdateFn;
                const fieldKey = activeField.fieldKey;
                const suffix = fieldKey.endsWith('2') ? '2' : '';
                const prefix = fieldKey.replace(/2$/, '');

                if(fieldKey.startsWith('salesOfferButton')) {
                    renderStandardStylingPanel(comp.data, {
                        typography: { fontSize: `btnFontSize${suffix}`, fontWeight: `btnFontWeight${suffix}` },
                        colors: [ { key: `btnColor${suffix}`, label: 'Button Color' }, { key: `btnTextColor${suffix}`, label: 'Text Color' } ],
                        alignment: { align: `btnAlign${suffix}`},
                        sizing: { buttonWidth: `btnWidthType${suffix}` },
                        padding: [ { key: `btnPaddingTop${suffix}`, label: 'Padding T' }, { key: `btnPaddingBottom${suffix}`, label: 'Padding B' }, { key: `btnPaddingLeftRight${suffix}`, label: 'Padding L/R' } ],
                        showButtonStyle: true,
                        showMobileOverrides: true,
                        showGridReverse: comp.data.layout === 'grid',
                        customHtml: (d: Record<string,string>) => {
                            const bgColor = d[`btnColor${suffix}`] || '#007aff';
                            const textColor = d[`btnTextColor${suffix}`] || '#ffffff';
                            const bRadius = d[`btnBorderRadius${suffix}`] || '8';
                            const bColor = d[`btnBorderColor${suffix}`] || '';
                            const bWidth = d[`btnBorderWidth${suffix}`] || '0';
                            const borderStyle = parseInt(bWidth) > 0 ? `border: ${bWidth}px solid ${bColor || bgColor}` : 'border: none';
                            return `
                                <div class="styling-section" style="margin-top: 8px;">
                                    <label class="form-label">Border</label>
                                    <div class="grid grid-cols-3" style="gap: 6px;">
                                        <div class="form-group"><label class="form-label" style="font-size:10px;">Radius</label><input type="number" min="0" max="50" class="form-control style-control" data-style-key="btnBorderRadius${suffix}" value="${bRadius}"></div>
                                        <div class="form-group"><label class="form-label" style="font-size:10px;">Width</label><input type="number" min="0" max="10" class="form-control style-control" data-style-key="btnBorderWidth${suffix}" value="${bWidth}"></div>
                                        <div class="form-group"><label class="form-label" style="font-size:10px;">Color</label><input type="color" class="form-control style-control" data-style-key="btnBorderColor${suffix}" value="${bColor || bgColor}" style="height:27px;padding:2px;"></div>
                                    </div>
                                </div>
                                <div style="margin-top: 10px; padding: 12px; background: #f5f5f7; border-radius: 8px; text-align: center;">
                                    <div style="display:inline-block;padding:${d[`btnPaddingTop${suffix}`] || '9'}px ${d[`btnPaddingLeftRight${suffix}`] || '15'}px ${d[`btnPaddingBottom${suffix}`] || '9'}px;background-color:${bgColor};color:${textColor};border-radius:${bRadius}px;font-size:${d[`btnFontSize${suffix}`] || '12'}px;font-weight:${d[`btnFontWeight${suffix}`] || 'bold'};${borderStyle};font-family:Arial,sans-serif;">Button Preview</div>
                                </div>
                            `;
                        }
                    }, baseUpdateFn);
                } else {
                    if (activeField.subOfferIndex !== undefined) {
                        const offersKey = fieldKey.includes('2') ? 'additionalOffers2' : 'additionalOffers';
                        const offers = JSON.parse(comp.data[offersKey] || '[]');
                        dataObject = offers[activeField.subOfferIndex] || {};
                        updateFn = (key: string, value: string) => updateSubOfferData(comp.id, activeField.subOfferIndex as number, key, value, offersKey);
                    }
                    const finalPrefix = prefix.replace(/2$/, '');
                    const keySuffix = activeField.subOfferIndex !== undefined ? '' : suffix;
                     renderStandardStylingPanel(dataObject, {
                        typography: { fontSize: `${finalPrefix}FontSize${keySuffix}`, fontWeight: `${finalPrefix}FontWeight${keySuffix}`, fontStyle: `${finalPrefix}FontStyle${keySuffix}` },
                        colors: [ { key: `${finalPrefix}Color${keySuffix}`, label: 'Text Color'}, { key: `${finalPrefix}BgColor${keySuffix}`, label: 'Background'} ],
                        alignment: { textAlign: `${finalPrefix}TextAlign${keySuffix}`},
                        padding: [ { key: `${finalPrefix}PaddingTop${keySuffix}`, label: 'Padding T'}, { key: `${finalPrefix}PaddingBottom${keySuffix}`, label: 'Padding B'}, { key: `${finalPrefix}PaddingLeftRight${keySuffix}`, label: 'Padding L/R' } ]
                    }, updateFn);
                }
            }
            break;
        
        case 'service_offer':
             const serviceFieldKey = activeField.fieldKey;
             let serviceConfig: Record<string, any> = { showMobileOverrides: true };
             const suffix = serviceFieldKey.endsWith('2') ? '2' : '';
             const baseKey = serviceFieldKey.replace(/2$/, '');
             switch(baseKey) {
                case 'serviceOfferTitle':
                case 'serviceOfferDetails':
                case 'serviceOfferDisclaimer': {
                    const prefix = baseKey.replace('serviceOffer', '').toLowerCase();
                    serviceConfig = {
                        typography: { fontSize: `${prefix}FontSize${suffix}`, fontWeight: `${prefix}FontWeight${suffix}`, fontStyle: `${prefix}FontStyle${suffix}`},
                        colors: [{key: `${prefix}TextColor${suffix}`, label: 'Text Color'}, {key: `${prefix}BgColor${suffix}`, label: 'Background'}],
                        alignment: { textAlign: `${prefix}Alignment${suffix}`},
                        padding: [
                            {key: `${prefix}PaddingTop${suffix}`, label: 'Padding T'}, {key: `${prefix}PaddingBottom${suffix}`, label: 'Padding B'},
                            {key: `${prefix}PaddingLeftRight${suffix}`, label: 'Padding L/R'}
                        ]
                    };
                    break;
                }
                case 'serviceOfferCoupon': {
                    const prefix = 'coupon';
                    serviceConfig = {
                        typography: { fontSize: `${prefix}FontSize${suffix}`, fontWeight: `${prefix}FontWeight${suffix}`, fontStyle: `${prefix}FontStyle${suffix}`},
                        colors: [{key: `${prefix}TextColor${suffix}`, label: 'Text Color'}, {key: `${prefix}BgColor${suffix}`, label: 'Background'}],
                        alignment: { textAlign: `${prefix}Alignment${suffix}`},
                        padding: [
                            {key: `${prefix}PaddingTop${suffix}`, label: 'Padding T'}, {key: `${prefix}PaddingBottom${suffix}`, label: 'Padding B'},
                            {key: `${prefix}PaddingLeftRight${suffix}`, label: 'Padding L/R'}
                        ]
                    };
                    break;
                }
                case 'serviceOfferButton':
                    serviceConfig = {
                         typography: { fontSize: `buttonFontSize${suffix}`, fontWeight: `buttonFontWeight${suffix}` },
                         colors: [{key: `buttonBgColor${suffix}`, label: 'Button Color'}, {key: `buttonTextColor${suffix}`, label: 'Text Color'}],
                         alignment: { align: `buttonAlignment${suffix}`},
                         sizing: { buttonWidth: `buttonWidth${suffix}` },
                         padding: [
                            {key: `buttonPaddingTop${suffix}`, label: 'Padding T'}, {key: `buttonPaddingBottom${suffix}`, label: 'Padding B'},
                            {key: `buttonPaddingLeftRight${suffix}`, label: 'Padding L/R'}
                        ],
                        customHtml: (d: Record<string,string>) => {
                            const bgColor = d[`buttonBgColor${suffix}`] || '#0066FF';
                            const textColor = d[`buttonTextColor${suffix}`] || '#FFFFFF';
                            const bRadius = d[`buttonBorderRadius${suffix}`] || '8';
                            const bColor = d[`buttonBorderColor${suffix}`] || '';
                            const bWidth = d[`buttonBorderWidth${suffix}`] || '0';
                            const borderStyle = parseInt(bWidth) > 0 ? `border: ${bWidth}px solid ${bColor || bgColor}` : 'border: none';
                            return `
                                <div class="styling-section" style="margin-top: 8px;">
                                    <label class="form-label">Border</label>
                                    <div class="grid grid-cols-3" style="gap: 6px;">
                                        <div class="form-group"><label class="form-label" style="font-size:10px;">Radius</label><input type="number" min="0" max="50" class="form-control style-control" data-style-key="buttonBorderRadius${suffix}" value="${bRadius}"></div>
                                        <div class="form-group"><label class="form-label" style="font-size:10px;">Width</label><input type="number" min="0" max="10" class="form-control style-control" data-style-key="buttonBorderWidth${suffix}" value="${bWidth}"></div>
                                        <div class="form-group"><label class="form-label" style="font-size:10px;">Color</label><input type="color" class="form-control style-control" data-style-key="buttonBorderColor${suffix}" value="${bColor || bgColor}" style="height:27px;padding:2px;"></div>
                                    </div>
                                </div>
                                <div style="margin-top: 10px; padding: 12px; background: #f5f5f7; border-radius: 8px; text-align: center;">
                                    <div style="display:inline-block;padding:${d[`buttonPaddingTop${suffix}`] || '9'}px ${d[`buttonPaddingLeftRight${suffix}`] || '15'}px ${d[`buttonPaddingBottom${suffix}`] || '9'}px;background-color:${bgColor};color:${textColor};border-radius:${bRadius}px;font-size:${d[`buttonFontSize${suffix}`] || '12'}px;font-weight:${d[`buttonFontWeight${suffix}`] || 'bold'};${borderStyle};font-family:Arial,sans-serif;">Button Preview</div>
                                </div>
                            `;
                        },
                         showButtonStyle: true
                    };
                    break;
                case 'serviceOfferImage':
                     serviceConfig = {
                        sizing: { width: `imageWidth${suffix}` },
                        alignment: { align: `imageAlignment${suffix}` },
                        padding: [{key: `imagePaddingTop${suffix}`, label: 'Padding T'}, {key: `imagePaddingBottom${suffix}`, label: 'Padding B'}]
                    };
                    break;
                default:
                    dynamicStylingContainer.innerHTML = `<div class="design-option-group" style="padding: 10px; text-align: center; color: var(--label-secondary); font-size: 13px;">Select a specific field to see its styling options.</div>`;
                    return;
             }
             serviceConfig.showMobileOverrides = true;
             if (comp.data.layout === 'grid') serviceConfig.showGridReverse = true;
             renderStandardStylingPanel(comp.data, serviceConfig, baseUpdateFn);
             break;
        
        case 'image':
             renderStandardStylingPanel(comp.data, {
                sizing: { width: 'width'},
                alignment: { align: 'align' },
                padding: [{key: 'paddingTop', label: 'Padding T'}, {key: 'paddingBottom', label: 'Padding B'}, {key: 'paddingLeftRight', label: 'Padding L/R'}],
                showMobileOverrides: true
            }, baseUpdateFn);
            break;

        case 'divider': {
            const config = {
                sizing: { width: 'width', thickness: 'thickness' },
                colors: [{ key: 'lineColor', label: 'Line Color' }],
                alignment: { alignment: 'alignment' },
                padding: [
                    {key: 'paddingTop', label: 'Padding T'}, {key: 'paddingBottom', label: 'Padding B'},
                    {key: 'paddingLeftRight', label: 'Padding L/R'}
                ],
                showMobileOverrides: true
            };
            const updateFn = (key: string, value: string) => {
                baseUpdateFn(key, value);
                
                // Update live preview in form
                const previewContainer = document.querySelector(`[data-id='${comp.id}'] .divider-preview-container`);
                const previewLine = document.querySelector(`[data-id='${comp.id}'] .divider-preview-line`) as HTMLElement;

                if (previewContainer && previewLine) {
                    const currentData = activeComponents.find(c => c.id === comp.id)?.data;
                    if (!currentData) return;
                    previewLine.style.width = `${currentData.width}%`;
                    previewLine.style.height = `${currentData.thickness}px`;
                    previewLine.style.backgroundColor = currentData.lineColor;
                    previewContainer.setAttribute('data-alignment', currentData.alignment);
                    (previewContainer as HTMLElement).style.paddingTop = `${currentData.paddingTop}px`;
                    (previewContainer as HTMLElement).style.paddingBottom = `${currentData.paddingBottom}px`;
                }
            };
            renderStandardStylingPanel(comp.data, config, updateFn);
            break;
        }

        case 'spacer': {
            const matchBg = comp.data.matchEmailBackground === 'true';
            const config = {
                sizing: { height: 'height' },
                colors: [{ key: 'backgroundColor', label: 'Background'}],
                customHtml: (d: Record<string,string>) => `
                    <div class="form-group" style="display: flex; align-items: center; gap: var(--spacing-sm);">
                        <input type="checkbox" id="match-bg-checkbox" class="style-control" data-style-key="matchEmailBackground" ${d.matchEmailBackground === 'true' ? 'checked' : ''} style="width: auto; height: auto;">
                        <label for="match-bg-checkbox" class="form-label" style="margin-bottom: 0;">Match Email Background</label>
                    </div>
                `,
                showMobileOverrides: true
            };
            const updateFn = (key: string, value: string) => {
                baseUpdateFn(key, value);
                if (key === 'matchEmailBackground') {
                    renderStylingPanel();
                }
                const preview = document.querySelector(`[data-id='${comp.id}'] .spacer-preview`) as HTMLElement;
                const label = preview?.querySelector('.spacer-preview-label') as HTMLElement;
                if (!preview || !label) return;

                const currentData = activeComponents.find(c => c.id === comp.id)?.data;
                if(!currentData) return;

                preview.style.height = `${currentData.height}px`;
                label.textContent = `Height: ${currentData.height}px`;
                const isMatch = currentData.matchEmailBackground === 'true';
                const newBgColor = isMatch ? 'transparent' : currentData.backgroundColor;
                preview.style.backgroundColor = newBgColor;
                preview.classList.toggle('has-bg-color', !isMatch && newBgColor !== 'transparent');
            };
            renderStandardStylingPanel(comp.data, config, updateFn, { backgroundColor: matchBg });
            break;
        }

        default:
             dynamicStylingContainer.innerHTML = '';
             break;
    }
    
    attachColorPickerListeners();
};


// --- START: Keyboard Shortcut System Implementation ---

const saveToHistory = () => {
    if (commandHistoryIndex < commandHistory.length - 1) {
        commandHistory = commandHistory.slice(0, commandHistoryIndex + 1);
    }

    // Compare before cloning — skip expensive structuredClone if state is unchanged
    if (commandHistory.length > 0) {
        const last = commandHistory[commandHistory.length - 1];
        if (JSON.stringify(last.activeComponents) === JSON.stringify(activeComponents) &&
            JSON.stringify(last.designSettings) === JSON.stringify(designSettings)) {
            return;
        }
    }

    commandHistory.push({
        designSettings: structuredClone(designSettings),
        activeComponents: structuredClone(activeComponents),
        timestamp: Date.now()
    });

    if (commandHistory.length > MAX_HISTORY_SIZE) {
        commandHistory.shift();
    }

    commandHistoryIndex = commandHistory.length - 1;
};

const executeUndo = () => {
    if (commandHistoryIndex > 0) {
        commandHistoryIndex--;
        activeComponents = structuredClone(commandHistory[commandHistoryIndex].activeComponents);
        designSettings = structuredClone(commandHistory[commandHistoryIndex].designSettings);
        renderComponents();
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        if (preheaderInput) { preheaderInput.value = designSettings.preheaderText || ''; updatePreheaderCounter(); }
        saveDraft();
        showToast('Undo', 'info');
    } else {
        showToast('Nothing to undo', 'info');
    }
};

const executeRedo = () => {
    if (commandHistoryIndex < commandHistory.length - 1) {
        commandHistoryIndex++;
        activeComponents = structuredClone(commandHistory[commandHistoryIndex].activeComponents);
        designSettings = structuredClone(commandHistory[commandHistoryIndex].designSettings);
        renderComponents();
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        if (preheaderInput) { preheaderInput.value = designSettings.preheaderText || ''; updatePreheaderCounter(); }
        saveDraft();
        showToast('Redo', 'info');
    } else {
        showToast('Nothing to redo', 'info');
    }
};

const moveComponent = (direction: 'up' | 'down') => {
    if (!selectedComponentId) return;
    const index = activeComponents.findIndex(c => c.id === selectedComponentId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        [activeComponents[index], activeComponents[index - 1]] = [activeComponents[index - 1], activeComponents[index]];
    } else if (direction === 'down' && index < activeComponents.length - 1) {
        [activeComponents[index], activeComponents[index + 1]] = [activeComponents[index + 1], activeComponents[index]];
    } else {
        return;
    }
    
    saveToHistory();
    renderComponents();
    saveDraft();
    setTimeout(() => {
        const el = document.querySelector(`.component-item[data-id='${selectedComponentId}']`) as HTMLElement;
        el?.focus();
    }, 50);
};


const isTypingContext = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (isTypingContext(e)) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }
  
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
  
    const matchedShortcut = shortcuts.find(s => 
      s.key.toLowerCase() === e.key.toLowerCase() &&
      !!s.ctrl === ctrl &&
      !!s.shift === e.shiftKey &&
      !!s.alt === e.altKey &&
      (!s.condition || s.condition())
    );
  
    if (matchedShortcut) {
      e.preventDefault();
      matchedShortcut.action(e);
    }
};
  
const initKeyboardShortcuts = () => {
    shortcuts = [
        { key: 'z', ctrl: true, description: 'Undo last action', category: 'Editing', action: executeUndo },
        { key: 'z', ctrl: true, shift: true, description: 'Redo last action', category: 'Editing', action: executeRedo },
        { key: 's', ctrl: true, description: 'Save current template', category: 'General', action: () => activeTemplateId ? updateActiveTemplate() : saveTemplate() },
        { key: 'n', ctrl: true, description: 'Add new section', category: 'Components', action: () => addComponentBtn?.click() },
        { key: 'd', ctrl: true, description: 'Duplicate selected section', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && duplicateComponent(selectedComponentId) },
        { key: 'b', ctrl: true, description: 'Save section to library', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && saveComponentToLibrary(selectedComponentId) },
        { key: 'ArrowUp', description: 'Select previous section', category: 'Navigation', action: () => {
            if (!selectedComponentId) {
                selectComponent(activeComponents[activeComponents.length - 1]?.id);
            } else {
                const index = activeComponents.findIndex(c => c.id === selectedComponentId);
                if (index > 0) selectComponent(activeComponents[index - 1].id);
            }
        }},
        { key: 'ArrowDown', description: 'Select next section', category: 'Navigation', action: () => {
            if (!selectedComponentId) {
                selectComponent(activeComponents[0]?.id);
            } else {
                const index = activeComponents.findIndex(c => c.id === selectedComponentId);
                if (index < activeComponents.length - 1) selectComponent(activeComponents[index + 1].id);
            }
        }},
        { key: 'ArrowUp', ctrl: true, description: 'Move section up', category: 'Components', condition: () => !!selectedComponentId, action: () => moveComponent('up')},
        { key: 'ArrowDown', ctrl: true, description: 'Move section down', category: 'Components', condition: () => !!selectedComponentId, action: () => moveComponent('down')},
        { key: 'Delete', description: 'Delete selected section', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && removeComponent(selectedComponentId) },
        { key: 'Backspace', description: 'Delete selected section', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && removeComponent(selectedComponentId) },
        { key: 'Escape', description: 'Deselect section / Close modal', category: 'Navigation', action: () => {
            if (componentPickerOverlay?.classList.contains('visible')) {
                closeComponentPickerFunc();
            } else if (selectedComponentId) {
                selectComponent(null);
            }
        }},
    ];

    document.addEventListener('keydown', handleGlobalKeydown);
}

// --- END: Keyboard Shortcut System Implementation ---

const blendWithWhite = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha)).toString(16).padStart(2,'0');
    return `#${mix(r)}${mix(g)}${mix(b)}`;
};

const propagateBodyColor = (color: string) => {
    designSettings.globalBodyColor = color;
    const secondary = blendWithWhite(color, 0.55);
    const tertiary  = blendWithWhite(color, 0.40);
    activeComponents.forEach(comp => {
        if (['header', 'text_block'].includes(comp.type)) {
            comp.data.textColor = color;
        }
        if (comp.type === 'disclaimers') {
            comp.data.textColor = tertiary;
        }
        if (comp.type === 'sales_offer') {
            ['', '2'].forEach(sfx => {
                comp.data[`vehicleColor${sfx}`]    = color;
                comp.data[`detailsColor${sfx}`]    = secondary;
                comp.data[`stockVinColor${sfx}`]   = tertiary;
                comp.data[`mileageColor${sfx}`]    = tertiary;
                comp.data[`disclaimerColor${sfx}`] = tertiary;
                const key = `additionalOffers${sfx}`;
                try {
                    const offers = JSON.parse(comp.data[key] || '[]');
                    comp.data[key] = JSON.stringify(offers.map((o: any) => ({
                        ...o,
                        separatorColor:  color,
                        offerColor:      color,
                        detailsColor:    secondary,
                        disclaimerColor: tertiary,
                    })));
                } catch {}
            });
        }
        if (comp.type === 'service_offer') {
            ['', '2'].forEach(sfx => {
                comp.data[`titleTextColor${sfx}`]      = color;
                comp.data[`detailsTextColor${sfx}`]    = secondary;
                comp.data[`disclaimerTextColor${sfx}`] = tertiary;
            });
        }
    });
    saveDraft();
    saveToHistory();
    triggerPreviewUpdate();
};

const propagateLinkColor = (color: string) => {
    designSettings.globalLinkColor = color;
    activeComponents.forEach(comp => {
        if (comp.type === 'button') comp.data.backgroundColor = color;
        if (comp.type === 'service_offer') {
            comp.data.buttonBgColor = color; comp.data.buttonBgColor2 = color;
            comp.data.couponTextColor = color; comp.data.couponTextColor2 = color;
        }
        if (comp.type === 'sales_offer') {
            comp.data.btnColor = color; comp.data.btnColor2 = color;
            comp.data.mainOfferColor = color; comp.data.mainOfferColor2 = color;
        }
        if (comp.type === 'footer') comp.data.textColor = color;
    });
    saveDraft();
    saveToHistory();
    triggerPreviewUpdate();
};

const syncGlobalTextStylesUI = () => {
    const grid = document.getElementById('color-scheme-grid');
    if (!grid) return;
    grid.querySelectorAll('.color-scheme-card').forEach(card => {
        const el = card as HTMLElement;
        const match = el.dataset.bodyColor === designSettings.globalBodyColor &&
                      el.dataset.accentColor === designSettings.globalLinkColor;
        el.classList.toggle('selected', match);
    });
};

function initGlobalTextStyles() {
    const grid = document.getElementById('color-scheme-grid');
    if (!grid) return;

    // Render preset scheme cards (no name label)
    grid.innerHTML = COLOR_SCHEMES.map(scheme => {
        const isActive = designSettings.globalBodyColor === scheme.bodyColor &&
                         designSettings.globalLinkColor === scheme.accentColor;
        return `
            <div class="color-scheme-card${isActive ? ' selected' : ''}"
                 data-scheme-id="${scheme.id}"
                 data-body-color="${scheme.bodyColor}"
                 data-accent-color="${scheme.accentColor}"
                 data-tooltip="${scheme.name}">
              <div class="scheme-swatches">
                <div class="scheme-swatch" style="background:${scheme.bodyColor};"></div>
                <div class="scheme-swatch" style="background:${scheme.accentColor};"></div>
              </div>
            </div>`;
    }).join('');

    // Append custom scheme card with live color pickers
    const isCustom = designSettings.colorScheme === 'custom';
    grid.innerHTML += `
        <div class="color-scheme-card${isCustom ? ' selected' : ''}" data-scheme-id="custom" data-tooltip="Custom">
          <div class="scheme-swatches">
            <div class="color-input-container mini" onclick="this.querySelector('input[type=color]').click()">
              <div class="color-swatch-display" style="background-color:${designSettings.globalBodyColor};"></div>
              <input type="color" class="color-input-hidden" id="custom-body-color" value="${designSettings.globalBodyColor}">
            </div>
            <div class="color-input-container mini" onclick="this.querySelector('input[type=color]').click()">
              <div class="color-swatch-display" style="background-color:${designSettings.globalLinkColor};"></div>
              <input type="color" class="color-input-hidden" id="custom-accent-color" value="${designSettings.globalLinkColor}">
            </div>
          </div>
        </div>`;

    // Click handler — skip propagation for custom card (color inputs handle it)
    grid.addEventListener('click', (e) => {
        const card = (e.target as Element).closest('.color-scheme-card') as HTMLElement | null;
        if (!card) return;
        const schemeId = card.dataset.schemeId!;

        if (schemeId === 'custom') {
            designSettings.colorScheme = 'custom';
            grid.querySelectorAll('.color-scheme-card').forEach(c => c.classList.toggle('selected', c === card));
            return;
        }

        const bodyColor   = card.dataset.bodyColor!;
        const accentColor = card.dataset.accentColor!;
        designSettings.colorScheme = schemeId;
        propagateBodyColor(bodyColor);
        propagateLinkColor(accentColor);
        grid.querySelectorAll('.color-scheme-card').forEach(c => c.classList.toggle('selected', c === card));
    });

    // Live listeners for custom color pickers
    const customBodyInput   = document.getElementById('custom-body-color')   as HTMLInputElement | null;
    const customAccentInput = document.getElementById('custom-accent-color') as HTMLInputElement | null;

    customBodyInput?.addEventListener('input', () => {
        designSettings.colorScheme = 'custom';
        const swatch = customBodyInput.previousElementSibling as HTMLElement | null;
        if (swatch) swatch.style.backgroundColor = customBodyInput.value;
        propagateBodyColor(customBodyInput.value);
        grid.querySelectorAll('.color-scheme-card').forEach(c =>
            c.classList.toggle('selected', (c as HTMLElement).dataset.schemeId === 'custom'));
    });

    customAccentInput?.addEventListener('input', () => {
        designSettings.colorScheme = 'custom';
        const swatch = customAccentInput.previousElementSibling as HTMLElement | null;
        if (swatch) swatch.style.backgroundColor = customAccentInput.value;
        propagateLinkColor(customAccentInput.value);
        grid.querySelectorAll('.color-scheme-card').forEach(c =>
            c.classList.toggle('selected', (c as HTMLElement).dataset.schemeId === 'custom'));
    });
}


// Save template button is dynamically rendered by renderSaveTemplateBtnArea()
document.getElementById('save-quick-btn')?.addEventListener('click', saveTemplate);

// Dealership modal close handlers
document.getElementById('close-dealership-modal')?.addEventListener('click', closeDealershipManager);
document.getElementById('dealership-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDealershipManager();
});

// Starter template click handlers
document.querySelectorAll('[data-starter-template]').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-starter-template');
        if (key) loadStarterTemplate(key);
    });
});

// Starter component click handlers
document.querySelectorAll('[data-starter-component]').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-starter-component');
        if (key) addStarterComponent(key);
    });
});

loadCollapsedStates();
renderMergeFieldsSidebar();
// Load active dealership from localStorage before loading draft
try { activeDealershipId = localStorage.getItem(LS_ACTIVE_DEALERSHIP_KEY) || null; } catch (e) {}
loadDraft();
initGlobalTextStyles();
renderComponents();
renderSavedTemplates();
renderComponentLibrary();
renderSaveTemplateBtnArea();
renderDealershipBanner();
initKeyboardShortcuts();
autocompleteDropdown = document.getElementById('autocomplete-dropdown');
