const fs = require('fs');

function replaceSidebar(filePath, category) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import
  if (!content.includes('import WindowsSidebar')) {
    content = content.replace(
      'import MobileFooter from "../components/MobileFooter";',
      'import MobileFooter from "../components/MobileFooter";\nimport WindowsSidebar from "../components/WindowsSidebar";'
    );
  }

  // Find the start of the aside
  const startTag = '<motion.aside';
  let startIdx = content.indexOf(startTag, content.indexOf('SIDEBAR'));
  
  if (startIdx === -1) {
    console.log('Could not find sidebar in', filePath);
    return;
  }
  
  // Find the end of the aside
  const endTag = '</motion.aside>';
  let endIdx = content.indexOf(endTag, startIdx) + endTag.length;
  
  const replacement = `<WindowsSidebar
                animationPhase={animationPhase}
                chromeDuration={chromeDuration}
                EASE={EASE}
                closeProject={closeProject}
                selectedProject={selectedProject}
                navigateProject={navigateProject}
                projectsLength={projects.length}
                category="${category}"
                ${category === 'design' ? `selectedImageIndex={selectedImageIndex}
                selectedImagesLength={selectedImages.length}
                showPreviousImage={showPreviousImage}
                showNextImage={showNextImage}` : ''}
              />`;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully updated', filePath);
}

replaceSidebar('e:/programs new/aruu-folio/aruu-folio/app/video-edits/page.tsx', 'video-edits');
replaceSidebar('e:/programs new/aruu-folio/aruu-folio/app/design/page.tsx', 'design');
