var gulp = require('gulp');
var install = require('gulp-install');
var clean = require('gulp-clean');
var ts = require('gulp-typescript');
var ncu = require('npm-check-updates');

var taskDir = './tasks/import-variable-group/'

gulp.task('default', ['install'], () => {
    setTimeout(() => {
        gulp.start('make');
    }, 8000);
});

gulp.task('install', () => {
    gulp.src(taskDir + 'package.json')
        .pipe(install());
});

gulp.task('make', () => {
    gulp.src(taskDir + '*.ts')
        .pipe(ts('tsconfig.json'))
        .pipe(gulp.dest(taskDir));
});

gulp.task('clean', () => {
    gulp.src(['*.js', '*.d.ts'], {cwd: taskDir, read: false})
        .pipe(clean({force: true}));
});

gulp.task('clean-all', ['clean'], () => {
    gulp.src(['node_modules'], {cwd: taskDir, read: false})
        .pipe(clean({force: true}));
});

gulp.task('update', () => {
    pkgUpdate(taskDir + 'package.json')
});

gulp.task('update-dev', () => {
    pkgUpdate('package.json');
});

gulp.task('update-all', ['update', 'update-dev']);

function pkgUpdate(pkgPath) {
    ncu.run({
        packageFile: pkgPath,
        jsonUpgraded: true
    }).then((upgraded) => {
        if (Object.keys(upgraded).length === 0) {
            console.log('All packages of the latest version. No need to update.');
        } else {
            console.log('Dependencies to upgrade:', upgraded);
            ncu.run({
                packageFile: pkgPath,
                silent: true,
                upgrade: true
            });
        }
    });
}