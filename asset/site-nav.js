(function () {
  const script = document.currentScript;
  const fragmentUrl = new URL('../site-nav.html', script.src);
  const cssUrl = new URL('site-nav.css', script.src);
  const fallbackNav = `
    <nav class="site-nav" aria-label="주요 메뉴">
      <div class="site-nav-inner">
        <a class="site-nav-brand" href="index.html"><span><b>TCG</b> CALENDAR</span></a>
        <div class="site-nav-links">
          <a href="index.html" class="site-nav-link" data-page="index.html"><span>메인</span></a>
          <div class="site-nav-group">
            <button class="site-nav-link site-nav-group-button" type="button" aria-expanded="false"><span>대회정보</span><span class="site-nav-chevron">⌄</span></button>
            <div class="site-nav-submenu">
              <a href="calendar_viewer.html" class="site-nav-submenu-link" data-page="calendar_viewer.html"><span><b>대회 일정</b><small>다가오는 TCG 대회 확인</small></span></a>
              <a href="result.html" class="site-nav-submenu-link" data-page="result.html"><span><b>대회 결과</b><small>매장별 대회 결과 확인</small></span></a>
              <a href="deck_meta.html" class="site-nav-submenu-link" data-page="deck_meta.html"><span><b>입상덱 메타</b><small>주간·월간 입상덱 분석</small></span></a>
            </div>
          </div>
          <div class="site-nav-group">
            <button class="site-nav-link site-nav-group-button" type="button" aria-expanded="false"><span>도구</span><span class="site-nav-chevron">⌄</span></button>
            <div class="site-nav-submenu">
              <a href="tcg-swisssystem.html" class="site-nav-submenu-link" data-page="tcg-swisssystem.html"><span><b>스위스라운드 시스템</b><small>대진 및 순위 자동 계산</small></span></a>
              <a href="tcgtimer.html" class="site-nav-submenu-link" data-page="tcgtimer.html"><span><b>TCG 타이머</b><small>대회용 라운드 타이머</small></span></a>
            </div>
          </div>
          <a href="tcg_map.html" class="site-nav-link" data-page="tcg_map.html"><span>매장 지도</span></a>
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

  async function loadSiteNav() {
    const oldNav = document.querySelector('.site-nav');
    if (!oldNav) return;
    try {
      let navHtml;
      try {
        const response = await fetch(fragmentUrl.href, { cache: 'no-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        navHtml = await response.text();
      } catch (fetchError) {
        console.warn('site-nav.html 대신 예비 메뉴를 사용합니다.', fetchError);
        navHtml = fallbackNav;
      }
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

      document.addEventListener('click', event => {
        if (!newNav.contains(event.target)) {
          menu?.classList.remove('open');
          button?.setAttribute('aria-expanded', 'false');
          groups.forEach(group => {
            group.classList.remove('open');
            group.querySelector('.site-nav-group-button')?.setAttribute('aria-expanded', 'false');
          });
        }
      });
    } catch (error) {
      console.error('공통 메뉴를 불러오지 못했습니다.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteNav, { once: true });
  } else {
    loadSiteNav();
  }
})();
