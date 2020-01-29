//
// Variables ===================================
//

// Load dependencies
const autoprefixer = require('gulp-autoprefixer');
const browsersync = require('browser-sync').create();
const cached = require('gulp-cached');
const cleancss = require('gulp-clean-css');
const del = require('del');
const fileinclude = require('gulp-file-include');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const npmdist = require('gulp-npm-dist');
const replace = require('gulp-replace');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const useref = require('gulp-useref');
const markdown = require('gulp-markdown');
const extender = require('gulp-html-extend')

//Including dependencies for https://github.com/shinnn/gulp-gh-pages
const {src, task}= require('gulp');
const ghPages = require('gulp-gh-pages');



// Create reference instance
const marked = markdown.marked
console.log(marked);

// Get reference
const renderer = new marked.Renderer();

// Override function
renderer.heading = function (text, level) {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

  return `
          <h${level}>
            <a name="${escapedText}" class="anchor" href="#${escapedText}">
              <span class="header-link"></span>
            </a>
            ${text}
          </h${level}>`;
};



// Define paths
const paths = {
  base: {
    base: {
      dir: './'
    },
    node: {
      dir: './node_modules'
    }
  },
  dist: {
    base: {
      dir: './dist'
    },
    libs: {
      dir: './dist/assets/libs'
    },
    blog: {
      dir: './dist/blog'
    }
  },
  src: {
    base: {
      dir: './src',
      files: './src/**/*'
    },
    css: {
      dir: './src/assets/css',
      files: './src/assets/css/**/*'
    },
    html: {
      dir: './src',
      files: './src/**/*.html',
    },
    img: {
      dir: './src/assets/img',
      files: './src/assets/img/**/*',
    },
    js: {
      dir: './src/assets/js',
      files: './src/assets/js/**/*'
    },
    partials: {
      dir: './src/partials',
      files: './src/partials/**/*'
    },
    scss: {
      dir: './src/assets/scss',
      files: './src/assets/scss/**/*',
      main: './src/assets/scss/*.scss'
    },
    tmp: {
      dir: './src/.tmp',
      dirblog: './src/.tmp/blog',
      files: './src/.tmp/**/*'
    },
    blog: {
      dir: './src/blog',
      files: './src/blog/*.md'
    }
  }
};

//
// Tasks ===================================
//

gulp.task('browsersync', function(callback) {
  browsersync.init({
    server: {
      baseDir: [paths.src.tmp.dir, paths.src.base.dir, paths.base.base.dir],
      serveStaticOptions: {
        extensions: ["html"]
      }
    },
  });
  callback();
});

gulp.task('browsersyncReload', function(callback) {
  browsersync.reload();
  callback();
});

gulp.task('watch', function() {
  gulp.watch(paths.src.scss.files, gulp.series('scss'));
  gulp.watch([paths.src.js.files, paths.src.img.files], gulp.series('browsersyncReload'));
  gulp.watch([paths.src.html.files, paths.src.partials.files, paths.src.blog.files], gulp.series('fileinclude', 'browsersyncReload'));
});

gulp.task('scss', function() {
  return gulp
    .src(paths.src.scss.main)
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest(paths.src.css.dir))
    .pipe(browsersync.stream());
});

gulp.task('fileinclude', function(callback) {
  return gulp
    .src([
      paths.src.html.files,
      paths.src.blog.files,
      '!' + paths.src.tmp.files,
      '!' + paths.src.partials.files
    ])
    .pipe(gulpif('*.md', markdown()))
    .pipe(extender({annotations:true,verbose:false}))
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true
    }))
    .pipe(cached())
    .pipe(gulp.dest(paths.src.tmp.dir));
});

gulp.task('clean:tmp', function(callback) {
  del.sync(paths.src.tmp.dir);
  callback();
});

gulp.task('clean:dist', function(callback) {
  del.sync(paths.dist.base.dir);
  callback();
});

gulp.task('copy:all', function() {
  return gulp
    .src([
      paths.src.base.files,
      '!' + paths.src.partials.dir, '!' + paths.src.partials.files,
      '!' + paths.src.scss.dir, '!' + paths.src.scss.files,
      '!' + paths.src.tmp.dir, '!' + paths.src.tmp.files,
      '!' + paths.src.js.dir, '!' + paths.src.js.files,
      '!' + paths.src.css.dir, '!' + paths.src.css.files,
      '!' + paths.src.html.files, '!' + paths.src.blog.files
    ])
    .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('copy:libs', function() {
  return gulp
    .src(npmdist(), {
      base: paths.base.node.dir
    })
    .pipe(gulp.dest(paths.dist.libs.dir));
});

gulp.task('html', function() {
  return gulp
    .src([
      paths.src.html.files,
      '!' + paths.src.tmp.files,
      '!' + paths.src.partials.files
    ])
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true
    }))
    .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
    .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/libs'))
    .pipe(useref())
    .pipe(cached())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', cleancss()))
    .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('blog', function() {
  return gulp
    .src([
      paths.src.blog.files
    ])
    .pipe(gulpif('*.md', markdown()))
    .pipe(extender({annotations:true,verbose:false}))
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true
    }))
    .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
    .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/libs'))
    .pipe(useref())
    .pipe(cached())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', cleancss()))
    .pipe(gulp.dest(paths.dist.base.dir))
})

gulp.task('build', gulp.series(gulp.parallel('clean:tmp', 'clean:dist', 'copy:all', 'copy:libs'), 'scss', 'html', 'blog'));

gulp.task('default', gulp.series(gulp.parallel('fileinclude','scss'), gulp.parallel('browsersync', 'watch')));

gulp.task('gh-pages', () => src('./dist/**/*').pipe(ghPages()));

gulp.task('deploy', gulp.series('build', 'gh-pages'));
