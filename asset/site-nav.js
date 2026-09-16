(function () {
  const script = document.currentScript;
  const fragmentUrl = new URL('../site-nav.html', script.src);
  const cssUrl = new URL('site-nav.css', script.src);
  // site-nav.html 과 같은 내용. fetch 를 기다리지 않고 먼저 이걸로 메뉴를 그린다.
  // (fetch 가 오래 걸리거나 멈추면 메뉴 자리가 빈 채로 남던 문제 방지)
  const fallbackNav = `
    <nav class="site-nav" aria-label="주요 메뉴">
      <div class="site-nav-inner">
        <a class="site-nav-brand" href="index.html" aria-label="TCG Calendar 홈"><span><b>TCG</b> CALENDAR</span></a>
        <div class="site-nav-links">
          <a href="index.html" class="site-nav-link" data-page="index.html">
            <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6"/></svg><span>메인</span>
          </a>
          <div class="site-nav-group">
            <button class="site-nav-link site-nav-group-button" type="button" aria-expanded="false">
              <svg viewBox="0 0 24 24"><path d="M5 3v3m14-3v3M3.5 9h17M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z"/><path d="M7 13h3m4 0h3m-10 4h3m4 0h3"/></svg><span>매장대회정보</span><svg class="site-nav-chevron" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg>
            </button>
            <div class="site-nav-submenu">
              <a href="calendar_viewer.html" class="site-nav-submenu-link" data-page="calendar_viewer.html"><span><b>대회 일정</b><small>매장별 대회 확인</small></span></a>
              <a href="result.html" class="site-nav-submenu-link" data-page="result.html"><span><b>대회 결과</b><small>매장별 대회 결과 확인</small></span></a>
              <a href="deck_meta.html" class="site-nav-submenu-link" data-page="deck_meta.html"><span><b>입상덱 메타</b><small>주간·월간 입상덱 분석</small></span></a>
            </div>
          </div>
          <div class="site-nav-group">
            <button class="site-nav-link site-nav-group-button" type="button" aria-expanded="false">
              <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.4Z"/></svg><span>도구</span><svg class="site-nav-chevron" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg>
            </button>
            <div class="site-nav-submenu">
              <a href="tcg-swisssystem.html" class="site-nav-submenu-link" data-page="tcg-swisssystem.html"><span><b>스위스라운드 시스템</b><small>대진 및 순위 자동 계산</small></span></a>
              <a href="tcgtimer.html" class="site-nav-submenu-link" data-page="tcgtimer.html"><span><b>TCG 타이머</b><small>대회용 라운드 타이머</small></span></a>
            </div>
          </div>
          <a href="tcg_map.html" class="site-nav-link" data-page="tcg_map.html">
            <svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>매장 지도</span>
          </a>
        </div>
        <button class="site-nav-hamburger" type="button" aria-label="메뉴 열기" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </nav>`;

  if (!document.querySelector('link[data-common-site-nav]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl.href;
    link.dataset.commonSiteNav = '';
    document.head.appendChild(link);
  }

  function currentPage() {
    const page = location.pathname.split('/').pop();
    return page || 'index.html';
  }

  // 현재 .site-nav 를 navHtml 로 바꾸고 클릭 동작을 붙인다. 성공하면 새 nav 를 돌려준다.
  function mountNav(navHtml) {
    const oldNav = document.querySelector('.site-nav');
    if (!oldNav) return null;
    const holder = document.createElement('div');
    holder.innerHTML = navHtml;
    const newNav = holder.querySelector('.site-nav');
    if (!newNav) throw new Error('site-nav element not found');
    oldNav.replaceWith(newNav);

    const page = currentPage();
    newNav.querySelectorAll('[data-page]').forEach(link => {
      const active = link.dataset.page === page;
      link.classList.toggle('active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
        link.closest('.site-nav-group')?.classList.add('child-active');
      }
    });

    const button = newNav.querySelector('.site-nav-hamburger');
    const menu = newNav.querySelector('.site-nav-links');
    const groups = Array.from(newNav.querySelectorAll('.site-nav-group'));

    button?.addEventListener('click', event => {
      event.stopPropagation();
      const open = menu.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });

    groups.forEach(group => {
      const groupButton = group.querySelector('.site-nav-group-button');
      groupButton?.addEventListener('click', event => {
        event.stopPropagation();
        if (window.matchMedia('(min-width: 761px)').matches) {
          groups.forEach(other => {
            other.classList.remove('open');
            other.querySelector('.site-nav-group-button')?.setAttribute('aria-expanded', 'false');
          });
          groupButton.blur();
          return;
        }
        const willOpen = !group.classList.contains('open');
        groups.forEach(other => {
          other.classList.remove('open');
          other.querySelector('.site-nav-group-button')?.setAttribute('aria-expanded', 'false');
        });
        group.classList.toggle('open', willOpen);
        groupButton.setAttribute('aria-expanded', String(willOpen));
      });
    });
    return newNav;
  }

  // 바깥 클릭 시 열린 메뉴 닫기 (nav 가 교체돼도 동작하도록 한 번만 등록하고 매번 찾는다)
  document.addEventListener('click', event => {
    const nav = document.querySelector('.site-nav');
    if (!nav || nav.contains(event.target)) return;
    nav.querySelector('.site-nav-links')?.classList.remove('open');
    nav.querySelector('.site-nav-hamburger')?.setAttribute('aria-expanded', 'false');
    nav.querySelectorAll('.site-nav-group').forEach(group => {
      group.classList.remove('open');
      group.querySelector('.site-nav-group-button')?.setAttribute('aria-expanded', 'false');
    });
  });

  async function loadSiteNav() {
    try {
      // 1) 내장 메뉴를 바로 그린다 → 네트워크 상태와 상관없이 항상 메뉴가 보인다
      if (!mountNav(fallbackNav)) return;
      // 2) site-nav.html 을 받아오면 그걸로 교체한다 (실패/지연 시 내장 메뉴 유지)
      const response = await fetch(fragmentUrl.href, { cache: 'no-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      mountNav(await response.text());
    } catch (error) {
      console.warn('site-nav.html 을 못 받아 내장 메뉴를 그대로 씁니다.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteNav, { once: true });
  } else {
    loadSiteNav();
  }
})();
